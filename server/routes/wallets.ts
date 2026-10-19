import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { CompanyWallet } from '../models/CompanyWallet.ts';
import { WalletTransaction } from '../models/WalletTransaction.ts';
import {
  getWalletCurrentBalance,
  recordOpeningBalance,
  addFundsToWallet,
  transferBetweenWallets,
} from '../services/ledgerService.ts';
import { requireAuth } from '../middleware/auth.ts';
import { requireWorkspaceMember, WorkspaceRequest } from '../middleware/workspace.ts';

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/wallets
router.get('/', requireAuth, requireWorkspaceMember, async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspace = req.workspace!;

    const wallets = await CompanyWallet.find({ workspace: workspace._id }).sort({
      createdAt: 1,
    });

    const result = await Promise.all(
      wallets.map(async (w) => {
        const balance = await getWalletCurrentBalance(w._id);
        return {
          id: w._id,
          name: w.name,
          type: w.type,
          openingBalance: w.openingBalance,
          currentBalance: balance,
          status: w.status,
          notes: w.notes,
          createdAt: w.createdAt,
        };
      })
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch wallets.' });
  }
});

// POST /api/workspaces/:workspaceId/wallets
router.post('/', requireAuth, requireWorkspaceMember, async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspace = req.workspace!;
    const user = req.user!;
    const { name, type, openingBalance, notes } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Wallet name is required.' });
      return;
    }

    const walletType = type === 'CASH' ? 'CASH' : 'BANK';
    const parsedOpening = Math.max(0, parseFloat(openingBalance) || 0);
    const roundedOpening = Math.round(parsedOpening * 100) / 100;

    const existing = await CompanyWallet.findOne({
      workspace: workspace._id,
      name: name.trim(),
    });
    if (existing) {
      res.status(400).json({ error: 'A wallet with this name already exists in the workspace.' });
      return;
    }

    const wallet = await CompanyWallet.create({
      workspace: workspace._id,
      name: name.trim(),
      type: walletType,
      openingBalance: roundedOpening,
      status: 'ACTIVE',
      notes: notes ? notes.trim() : undefined,
    });

    // Record opening balance transaction if > 0
    if (roundedOpening > 0) {
      await recordOpeningBalance(workspace._id, wallet._id, roundedOpening, user._id);
    }

    res.status(201).json({
      id: wallet._id,
      name: wallet.name,
      type: wallet.type,
      openingBalance: wallet.openingBalance,
      currentBalance: roundedOpening,
      status: wallet.status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create wallet.' });
  }
});

// PATCH /api/workspaces/:workspaceId/wallets/:walletId
router.patch(
  '/:walletId',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const { walletId } = req.params;
      const { name, status, notes } = req.body;

      const wallet = await CompanyWallet.findOne({
        _id: new Types.ObjectId(walletId),
        workspace: workspace._id,
      });

      if (!wallet) {
        res.status(404).json({ error: 'Wallet not found.' });
        return;
      }

      if (name && name.trim()) {
        wallet.name = name.trim();
      }

      if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
        wallet.status = status;
      }

      if (notes !== undefined) {
        wallet.notes = notes ? notes.trim() : undefined;
      }

      await wallet.save();
      const currentBalance = await getWalletCurrentBalance(wallet._id);

      res.json({
        id: wallet._id,
        name: wallet.name,
        type: wallet.type,
        currentBalance,
        status: wallet.status,
        notes: wallet.notes,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update wallet.' });
    }
  }
);

// POST /api/workspaces/:workspaceId/wallets/:walletId/funds - Add funds
router.post(
  '/:walletId/funds',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const user = req.user!;
      const { walletId } = req.params;
      const { amount, date, source, description } = req.body;

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({ error: 'Amount must be greater than zero.' });
        return;
      }

      if (!source || !source.trim()) {
        res.status(400).json({ error: 'Source is required (e.g., Partner contribution, Business income, Other).' });
        return;
      }

      const txn = await addFundsToWallet(
        workspace._id,
        walletId,
        parsedAmount,
        date ? new Date(date) : new Date(),
        source.trim(),
        description ? description.trim() : undefined,
        user._id
      );

      const updatedBalance = await getWalletCurrentBalance(walletId);

      res.status(201).json({
        message: 'Funds recorded successfully.',
        transaction: {
          id: txn._id,
          transactionId: txn.transactionId,
          amount: txn.amount,
          source: txn.source,
          resultingBalance: updatedBalance,
        },
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to add funds.' });
    }
  }
);

// POST /api/workspaces/:workspaceId/wallets/transfer - Inter-wallet transfer
router.post(
  '/transfer',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const user = req.user!;
      const { fromWalletId, toWalletId, amount, date, notes } = req.body;

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({ error: 'Transfer amount must be greater than zero.' });
        return;
      }

      if (!fromWalletId || !toWalletId) {
        res.status(400).json({ error: 'Source and destination wallets are required.' });
        return;
      }

      const result = await transferBetweenWallets(
        workspace._id,
        fromWalletId,
        toWalletId,
        parsedAmount,
        date ? new Date(date) : new Date(),
        notes,
        user._id
      );

      res.status(201).json({
        message: 'Funds transferred successfully.',
        transferGroupId: result.transferGroupId,
        amount: parsedAmount,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Transfer failed.' });
    }
  }
);

export default router;
