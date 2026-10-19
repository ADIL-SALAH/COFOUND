import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { WorkspaceMembership } from '../models/WorkspaceMembership.ts';
import { requireAuth } from '../middleware/auth.ts';
import { requireWorkspaceMember, WorkspaceRequest } from '../middleware/workspace.ts';

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/members
router.get('/', requireAuth, requireWorkspaceMember, async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspace = req.workspace!;

    const memberships = await WorkspaceMembership.find({
      workspace: workspace._id,
    })
      .populate('user', 'name email phone createdAt')
      .sort({ createdAt: 1 });

    const members = memberships
      .filter((m) => m.user)
      .map((m: any) => ({
        id: m.user._id,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone,
        role: m.role,
        joinedAt: m.createdAt,
      }));

    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch workspace members.' });
  }
});

// DELETE /api/workspaces/:workspaceId/members/:memberId
router.delete(
  '/:memberId',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const membership = req.membership!;
      const { memberId } = req.params;

      if (membership.role !== 'owner') {
        res.status(403).json({ error: 'Only workspace owners can remove team members.' });
        return;
      }

      if (req.user!._id.toString() === memberId) {
        res.status(400).json({ error: 'Cannot remove yourself as workspace owner.' });
        return;
      }

      const deleted = await WorkspaceMembership.findOneAndDelete({
        workspace: workspace._id,
        user: new Types.ObjectId(memberId),
      });

      if (!deleted) {
        res.status(404).json({ error: 'Member not found in workspace.' });
        return;
      }

      res.json({ message: 'Team member removed successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to remove team member.' });
    }
  }
);

export default router;
