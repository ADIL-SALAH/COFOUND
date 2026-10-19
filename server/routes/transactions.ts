import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { WalletTransaction } from '../models/WalletTransaction.ts';
import { requireAuth } from '../middleware/auth.ts';
import { requireWorkspaceMember, WorkspaceRequest } from '../middleware/workspace.ts';

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/transactions
router.get('/', requireAuth, requireWorkspaceMember, async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspace = req.workspace!;
    const { walletId, type, startDate, endDate, limit } = req.query;

    const filter: any = { workspace: workspace._id };

    if (walletId && typeof walletId === 'string' && walletId !== 'ALL') {
      filter.wallet = new Types.ObjectId(walletId);
    }

    if (type && typeof type === 'string' && type !== 'ALL') {
      filter.type = type;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const maxResults = limit ? parseInt(limit as string, 10) : 100;

    const transactions = await WalletTransaction.find(filter)
      .populate('wallet', 'name type')
      .populate('relatedExpense', 'paymentId title')
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(maxResults);

    const result = transactions.map((t: any) => ({
      id: t._id,
      transactionId: t.transactionId,
      walletId: t.wallet?._id,
      walletName: t.wallet?.name || 'Wallet',
      type: t.type,
      amount: t.amount,
      date: t.date,
      description: t.description,
      relatedPaymentId: t.relatedExpense?.paymentId,
      transferGroupId: t.transferGroupId,
      source: t.source,
      resultingBalance: t.resultingBalance,
      createdByName: t.createdBy?.name || 'Partner',
      createdAt: t.createdAt,
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

export default router;
