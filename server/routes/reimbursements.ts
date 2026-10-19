import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { ReimbursementSettlement } from '../models/ReimbursementSettlement.ts';
import {
  getAllPartnersReimbursements,
  getPartnerReimbursementSummary,
  processSettlement,
} from '../services/reimbursementService.ts';
import { requireAuth } from '../middleware/auth.ts';
import { requireWorkspaceMember, WorkspaceRequest } from '../middleware/workspace.ts';

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/reimbursements - Summary of all partner reimbursement balances
router.get('/', requireAuth, requireWorkspaceMember, async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspace = req.workspace!;
    const summaries = await getAllPartnersReimbursements(workspace._id);
    res.json(summaries);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch reimbursement summaries.' });
  }
});

// GET /api/workspaces/:workspaceId/reimbursements/partner/:partnerId
router.get(
  '/partner/:partnerId',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const { partnerId } = req.params;
      const summary = await getPartnerReimbursementSummary(workspace._id, partnerId);
      res.json(summary);
    } catch (err: any) {
      res.status(404).json({ error: err.message || 'Partner summary not found.' });
    }
  }
);

// POST /api/workspaces/:workspaceId/reimbursements/settle - Settle reimbursement
router.post(
  '/settle',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const user = req.user!;
      const { partnerId, walletId, amount, date, notes } = req.body;

      if (!partnerId || !walletId) {
        res.status(400).json({ error: 'Partner ID and Company Wallet ID are required.' });
        return;
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({ error: 'Settlement amount must be greater than zero.' });
        return;
      }

      const result = await processSettlement(
        workspace._id,
        partnerId,
        walletId,
        parsedAmount,
        date ? new Date(date) : new Date(),
        notes,
        user._id
      );

      res.status(201).json({
        message: 'Reimbursement settled successfully.',
        settlement: {
          id: result.settlement._id,
          settlementId: result.settlement.settlementId,
          amount: result.settlement.amount,
          date: result.settlement.date,
        },
        transactionId: result.transaction.transactionId,
        updatedPartnerSummary: result.updatedPartnerSummary,
        walletBalance: result.walletBalance,
      });
    } catch (err: any) {
      console.error('Settlement error:', err);
      res.status(400).json({ error: err.message || 'Settlement failed.' });
    }
  }
);

// GET /api/workspaces/:workspaceId/reimbursements/history - List settlement history
router.get(
  '/history',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const settlements = await ReimbursementSettlement.find({ workspace: workspace._id })
        .populate('partner', 'name email')
        .populate('companyWallet', 'name type')
        .populate('createdBy', 'name')
        .sort({ date: -1, createdAt: -1 });

      const result = settlements.map((s: any) => ({
        id: s._id,
        settlementId: s.settlementId,
        partnerName: s.partner?.name || 'Partner',
        walletName: s.companyWallet?.name || 'Wallet',
        amount: s.amount,
        date: s.date,
        notes: s.notes,
        createdByName: s.createdBy?.name || 'Partner',
        createdAt: s.createdAt,
      }));

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch settlement history.' });
    }
  }
);

export default router;
