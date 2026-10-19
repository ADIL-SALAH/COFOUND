import { Router, Response } from 'express';
import { Types } from 'mongoose';
import path from 'path';
import fs from 'fs';
import { Expense } from '../models/Expense.ts';
import { CompanyWallet } from '../models/CompanyWallet.ts';
import { WorkspaceMembership } from '../models/WorkspaceMembership.ts';
import { generateSequenceId } from '../services/sequenceService.ts';
import { recordCompanyExpensePayment } from '../services/ledgerService.ts';
import { requireAuth } from '../middleware/auth.ts';
import { requireWorkspaceMember, WorkspaceRequest } from '../middleware/workspace.ts';
import { receiptUpload } from '../middleware/upload.ts';

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/expenses
router.get('/', requireAuth, requireWorkspaceMember, async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspace = req.workspace!;
    const {
      category,
      paymentSourceType,
      partnerId,
      walletId,
      startDate,
      endDate,
      search,
    } = req.query;

    const filter: any = { workspace: workspace._id };

    if (category && typeof category === 'string' && category !== 'ALL') {
      filter.category = category;
    }

    if (paymentSourceType && typeof paymentSourceType === 'string' && paymentSourceType !== 'ALL') {
      filter.paymentSourceType = paymentSourceType;
    }

    if (partnerId && typeof partnerId === 'string' && partnerId !== 'ALL') {
      filter.payingPartner = new Types.ObjectId(partnerId);
    }

    if (walletId && typeof walletId === 'string' && walletId !== 'ALL') {
      filter.companyWallet = new Types.ObjectId(walletId);
    }

    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.expenseDate.$lte = end;
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: regex }, { paymentId: regex }, { description: regex }];
    }

    const expenses = await Expense.find(filter)
      .populate('payingPartner', 'name email')
      .populate('companyWallet', 'name type')
      .populate('createdBy', 'name')
      .sort({ expenseDate: -1, createdAt: -1 });

    const result = expenses.map((e: any) => ({
      id: e._id,
      paymentId: e.paymentId,
      title: e.title,
      amount: e.amount,
      expenseDate: e.expenseDate,
      category: e.category,
      paymentSourceType: e.paymentSourceType,
      payingPartnerId: e.payingPartner?._id,
      payingPartnerName: e.payingPartner?.name,
      companyWalletId: e.companyWallet?._id,
      companyWalletName: e.companyWallet?.name,
      description: e.description,
      hasReceipt: Boolean(e.receipt?.filename),
      receiptName: e.receipt?.originalName,
      reimbursedAmount: e.reimbursedAmount || 0,
      outstandingReimbursement:
        e.paymentSourceType === 'personal'
          ? Math.max(0, Math.round((e.amount - (e.reimbursedAmount || 0)) * 100) / 100)
          : 0,
      createdAt: e.createdAt,
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

// POST /api/workspaces/:workspaceId/expenses (with optional receipt upload)
router.post(
  '/',
  requireAuth,
  requireWorkspaceMember,
  receiptUpload.single('receipt'),
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const user = req.user!;

      const {
        title,
        amount,
        expenseDate,
        category,
        paymentSourceType,
        payingPartnerId,
        companyWalletId,
        description,
      } = req.body;

      if (!title || !title.trim()) {
        res.status(400).json({ error: 'Expense title is required.' });
        return;
      }

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        res.status(400).json({ error: 'Amount must be a positive number.' });
        return;
      }
      const roundedAmount = Math.round(numericAmount * 100) / 100;

      if (!category || !category.trim()) {
        res.status(400).json({ error: 'Expense category is required.' });
        return;
      }

      if (!['personal', 'company'].includes(paymentSourceType)) {
        res.status(400).json({ error: "Payment source type must be either 'personal' or 'company'." });
        return;
      }

      let payingPartner: Types.ObjectId | undefined;
      let companyWallet: Types.ObjectId | undefined;

      if (paymentSourceType === 'personal') {
        const partnerToSet = payingPartnerId || user._id.toString();
        // Verify partner is in workspace
        const membership = await WorkspaceMembership.findOne({
          workspace: workspace._id,
          user: new Types.ObjectId(partnerToSet),
        });
        if (!membership) {
          res.status(400).json({ error: 'Specified paying partner is not a member of this workspace.' });
          return;
        }
        payingPartner = new Types.ObjectId(partnerToSet);
      } else {
        if (!companyWalletId) {
          res.status(400).json({ error: 'Company wallet must be selected for company-paid expense.' });
          return;
        }
        const wallet = await CompanyWallet.findOne({
          _id: new Types.ObjectId(companyWalletId),
          workspace: workspace._id,
          status: 'ACTIVE',
        });
        if (!wallet) {
          res.status(400).json({ error: 'Selected company wallet not found or is inactive.' });
          return;
        }
        companyWallet = wallet._id;
      }

      // Generate atomic sequence payment ID
      const paymentId = await generateSequenceId(workspace._id, 'PAY');

      // Receipt metadata if file was uploaded
      let receiptMeta = undefined;
      if (req.file) {
        receiptMeta = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
        };
      }

      const parsedDate = expenseDate ? new Date(expenseDate) : new Date();

      // Create expense record
      const expense = await Expense.create({
        workspace: workspace._id,
        paymentId,
        title: title.trim(),
        amount: roundedAmount,
        expenseDate: parsedDate,
        category: category.trim(),
        paymentSourceType,
        payingPartner,
        companyWallet,
        description: description ? description.trim() : undefined,
        receipt: receiptMeta,
        reimbursedAmount: 0,
        createdBy: user._id,
      });

      // If company paid, record in wallet ledger (with sufficient funds check)
      if (paymentSourceType === 'company' && companyWallet) {
        await recordCompanyExpensePayment(
          workspace._id,
          companyWallet,
          expense._id,
          roundedAmount,
          parsedDate,
          expense.title,
          user._id
        );
      }

      res.status(201).json({
        message: 'Expense recorded successfully.',
        expense: {
          id: expense._id,
          paymentId: expense.paymentId,
          title: expense.title,
          amount: expense.amount,
          expenseDate: expense.expenseDate,
          category: expense.category,
          paymentSourceType: expense.paymentSourceType,
          payingPartnerId: expense.payingPartner,
          companyWalletId: expense.companyWallet,
          hasReceipt: Boolean(expense.receipt),
          receiptName: expense.receipt?.originalName,
        },
      });
    } catch (err: any) {
      console.error('Record expense error:', err);
      // Clean up uploaded file if error occurred
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_) {}
      }
      res.status(400).json({ error: err.message || 'Failed to record expense.' });
    }
  }
);

// GET /api/workspaces/:workspaceId/expenses/:expenseId
router.get(
  '/:expenseId',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const { expenseId } = req.params;

      const expense = await Expense.findOne({
        _id: new Types.ObjectId(expenseId),
        workspace: workspace._id,
      })
        .populate('payingPartner', 'name email')
        .populate('companyWallet', 'name type')
        .populate('createdBy', 'name');

      if (!expense) {
        res.status(404).json({ error: 'Expense not found.' });
        return;
      }

      res.json({
        id: expense._id,
        paymentId: expense.paymentId,
        title: expense.title,
        amount: expense.amount,
        expenseDate: expense.expenseDate,
        category: expense.category,
        paymentSourceType: expense.paymentSourceType,
        payingPartner: expense.payingPartner,
        companyWallet: expense.companyWallet,
        description: expense.description,
        hasReceipt: Boolean(expense.receipt),
        receiptName: expense.receipt?.originalName,
        receiptSize: expense.receipt?.size,
        receiptMimeType: expense.receipt?.mimeType,
        reimbursedAmount: expense.reimbursedAmount || 0,
        createdBy: expense.createdBy,
        createdAt: expense.createdAt,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve expense.' });
    }
  }
);

// GET /api/workspaces/:workspaceId/expenses/:expenseId/receipt - Authenticated receipt download
router.get(
  '/:expenseId/receipt',
  requireAuth,
  requireWorkspaceMember,
  async (req: WorkspaceRequest, res: Response) => {
    try {
      const workspace = req.workspace!;
      const { expenseId } = req.params;

      const expense = await Expense.findOne({
        _id: new Types.ObjectId(expenseId),
        workspace: workspace._id,
      });

      if (!expense || !expense.receipt) {
        res.status(404).json({ error: 'Receipt not found for this expense.' });
        return;
      }

      const filePath = expense.receipt.path;
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Receipt file does not exist on disk.' });
        return;
      }

      res.setHeader('Content-Type', expense.receipt.mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(expense.receipt.originalName)}"`
      );
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to download receipt.' });
    }
  }
);

export default router;
