import { Router, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import { Workspace } from '../models/Workspace.ts';
import { WorkspaceMembership } from '../models/WorkspaceMembership.ts';
import { WorkspaceInvitation } from '../models/WorkspaceInvitation.ts';
import { CompanyWallet } from '../models/CompanyWallet.ts';
import { Goal } from '../models/Goal.ts';
import { Task } from '../models/Task.ts';
import { Expense } from '../models/Expense.ts';
import { WalletTransaction } from '../models/WalletTransaction.ts';
import { ReimbursementSettlement } from '../models/ReimbursementSettlement.ts';
import { SequenceCounter } from '../models/SequenceCounter.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { requireWorkspaceMember, WorkspaceRequest } from '../middleware/workspace.ts';

const router = Router();

// POST /api/workspaces - Create a new workspace
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const user = req.user!;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Workspace name is required.' });
      return;
    }

    const workspace = await Workspace.create({
      name: name.trim(),
      owner: user._id,
    });

    // Add user as owner in WorkspaceMembership
    await WorkspaceMembership.create({
      workspace: workspace._id,
      user: user._id,
      role: 'owner',
    });

    // Automatically create default company wallets
    await CompanyWallet.create([
      {
        workspace: workspace._id,
        name: 'Company Cash',
        type: 'CASH',
        openingBalance: 0,
        status: 'ACTIVE',
      },
      {
        workspace: workspace._id,
        name: 'Company Bank 1',
        type: 'BANK',
        openingBalance: 0,
        status: 'ACTIVE',
      },
      {
        workspace: workspace._id,
        name: 'Company Bank 2',
        type: 'BANK',
        openingBalance: 0,
        status: 'ACTIVE',
      },
    ]);

    // Create an initial invite code
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    await WorkspaceInvitation.create({
      workspace: workspace._id,
      inviteCode,
      role: 'member',
      createdBy: user._id,
      status: 'ACTIVE',
    });

    res.status(201).json({
      message: 'Workspace created successfully with default wallets.',
      workspace: {
        id: workspace._id,
        name: workspace.name,
        role: 'owner',
        inviteCode,
      },
    });
  } catch (err: any) {
    console.error('Workspace creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create workspace.' });
  }
});

// GET /api/workspaces - Get all workspaces user belongs to
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const memberships = await WorkspaceMembership.find({ user: user._id }).populate('workspace');

    const list = memberships
      .filter((m) => m.workspace)
      .map((m: any) => ({
        id: m.workspace._id,
        name: m.workspace.name,
        role: m.role,
        isOwner: m.role === 'owner',
        createdAt: m.workspace.createdAt,
      }));

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch workspaces.' });
  }
});

// GET /api/workspaces/:workspaceId - Get workspace details
router.get('/:workspaceId', requireAuth, requireWorkspaceMember, async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspace = req.workspace!;
    const membership = req.membership!;

    const invitation = await WorkspaceInvitation.findOne({
      workspace: workspace._id,
      status: 'ACTIVE',
    }).sort({ createdAt: -1 });

    res.json({
      id: workspace._id,
      name: workspace.name,
      role: membership.role,
      isOwner: membership.role === 'owner',
      inviteCode: invitation?.inviteCode,
      createdAt: workspace.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch workspace details.' });
  }
});

// POST /api/workspaces/:workspaceId/invitations - Generate fresh invite code
router.post(
  '/:workspaceId/invitations',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const user = req.user!;

      // Deactivate old invitations
      await WorkspaceInvitation.updateMany(
        { workspace: workspace._id, status: 'ACTIVE' },
        { status: 'EXPIRED' }
      );

      const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      const invitation = await WorkspaceInvitation.create({
        workspace: workspace._id,
        inviteCode,
        role: 'member',
        createdBy: user._id,
        status: 'ACTIVE',
      });

      res.status(201).json({
        inviteCode: invitation.inviteCode,
        message: 'New invitation code created.',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate invitation code.' });
    }
  }
);

// POST /api/workspaces/join - Join workspace via invite code
router.post('/join', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.body;
    const user = req.user!;

    if (!inviteCode || !inviteCode.trim()) {
      res.status(400).json({ error: 'Invitation code is required.' });
      return;
    }

    const invitation = await WorkspaceInvitation.findOne({
      inviteCode: inviteCode.trim().toUpperCase(),
      status: 'ACTIVE',
    }).populate('workspace');

    if (!invitation || !invitation.workspace) {
      res.status(404).json({ error: 'Invalid or expired invitation code.' });
      return;
    }

    const workspaceId = (invitation.workspace as any)._id;

    // Check if user is already a member
    const existing = await WorkspaceMembership.findOne({
      workspace: workspaceId,
      user: user._id,
    });

    if (existing) {
      res.json({
        message: 'You are already a member of this workspace.',
        workspace: {
          id: (invitation.workspace as any)._id,
          name: (invitation.workspace as any).name,
          role: existing.role,
        },
      });
      return;
    }

    // Add membership
    const membership = await WorkspaceMembership.create({
      workspace: workspaceId,
      user: user._id,
      role: invitation.role || 'member',
    });

    res.status(201).json({
      message: 'Joined workspace successfully.',
      workspace: {
        id: (invitation.workspace as any)._id,
        name: (invitation.workspace as any).name,
        role: membership.role,
      },
    });
  } catch (err: any) {
    console.error('Join workspace error:', err);
    res.status(500).json({ error: err.message || 'Failed to join workspace.' });
  }
});

// DELETE /api/workspaces/:workspaceId - Owner-only cascade delete
router.delete(
  '/:workspaceId',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const membership = req.membership!;

      if (membership.role !== 'owner') {
        res.status(403).json({ error: 'Only the workspace owner can delete this workspace.' });
        return;
      }

      // 1. Delete physical receipt files from disk
      const expensesWithReceipts = await Expense.find({
        workspace: workspace._id,
        'receipt.path': { $exists: true },
      });
      for (const exp of expensesWithReceipts) {
        if (exp.receipt?.path && fs.existsSync(exp.receipt.path)) {
          try {
            fs.unlinkSync(exp.receipt.path);
          } catch (_) {}
        }
      }

      // 2. Cascade delete all workspace data
      await Promise.all([
        Goal.deleteMany({ workspace: workspace._id }),
        Task.deleteMany({ workspace: workspace._id }),
        Expense.deleteMany({ workspace: workspace._id }),
        CompanyWallet.deleteMany({ workspace: workspace._id }),
        WalletTransaction.deleteMany({ workspace: workspace._id }),
        ReimbursementSettlement.deleteMany({ workspace: workspace._id }),
        WorkspaceInvitation.deleteMany({ workspace: workspace._id }),
        WorkspaceMembership.deleteMany({ workspace: workspace._id }),
        SequenceCounter.deleteMany({ workspace: workspace._id }),
        Workspace.findByIdAndDelete(workspace._id),
      ]);

      res.json({ message: `Workspace "${workspace.name}" has been permanently deleted.` });
    } catch (err: any) {
      console.error('Delete workspace error:', err);
      res.status(500).json({ error: err.message || 'Failed to delete workspace.' });
    }
  }
);

// POST /api/workspaces/:workspaceId/leave - Non-owner leave workspace
router.post(
  '/:workspaceId/leave',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const membership = req.membership!;
      const user = req.user!;

      if (membership.role === 'owner') {
        res.status(400).json({
          error: 'Workspace owners cannot leave the workspace. You can delete the workspace instead.',
        });
        return;
      }

      await WorkspaceMembership.findOneAndDelete({
        workspace: workspace._id,
        user: user._id,
      });

      res.json({ message: `You have left the workspace "${workspace.name}".` });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to leave workspace.' });
    }
  }
);

export default router;
