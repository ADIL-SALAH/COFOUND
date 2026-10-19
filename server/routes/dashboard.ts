import { Router, Response } from 'express';
import { CompanyWallet } from '../models/CompanyWallet.ts';
import { Expense } from '../models/Expense.ts';
import { Goal } from '../models/Goal.ts';
import { Task } from '../models/Task.ts';
import { WalletTransaction } from '../models/WalletTransaction.ts';
import { getWalletCurrentBalance } from '../services/ledgerService.ts';
import { getAllPartnersReimbursements } from '../services/reimbursementService.ts';
import { requireAuth } from '../middleware/auth.ts';
import { requireWorkspaceMember, WorkspaceRequest } from '../middleware/workspace.ts';

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/dashboard
router.get('/', requireAuth, requireWorkspaceMember, async (req: WorkspaceRequest, res: Response) => {
  try {
    const workspace = req.workspace!;

    // 1. Wallets & Company Funds
    const activeWallets = await CompanyWallet.find({
      workspace: workspace._id,
      status: 'ACTIVE',
    });

    let totalCompanyFunds = 0;
    let cashBalance = 0;
    const walletBalances: Array<{ id: string; name: string; type: string; balance: number }> = [];

    for (const w of activeWallets) {
      const balance = await getWalletCurrentBalance(w._id);
      totalCompanyFunds += balance;
      if (w.type === 'CASH') {
        cashBalance += balance;
      }
      walletBalances.push({
        id: w._id.toString(),
        name: w.name,
        type: w.type,
        balance,
      });
    }

    totalCompanyFunds = Math.round(totalCompanyFunds * 100) / 100;
    cashBalance = Math.round(cashBalance * 100) / 100;

    // 2. Expenses Summary
    const expenses = await Expense.find({ workspace: workspace._id })
      .populate('payingPartner', 'name')
      .populate('companyWallet', 'name');

    let totalBusinessExpenses = 0;
    let totalCompanyPaid = 0;
    const partnerSpendMap: Record<string, { name: string; amount: number }> = {};

    for (const exp of expenses) {
      totalBusinessExpenses += exp.amount;
      if (exp.paymentSourceType === 'company') {
        totalCompanyPaid += exp.amount;
      } else if (exp.paymentSourceType === 'personal' && exp.payingPartner) {
        const pId = (exp.payingPartner as any)._id.toString();
        const pName = (exp.payingPartner as any).name;
        if (!partnerSpendMap[pId]) {
          partnerSpendMap[pId] = { name: pName, amount: 0 };
        }
        partnerSpendMap[pId].amount += exp.amount;
      }
    }

    totalBusinessExpenses = Math.round(totalBusinessExpenses * 100) / 100;
    totalCompanyPaid = Math.round(totalCompanyPaid * 100) / 100;

    const partnerSpending = Object.entries(partnerSpendMap).map(([id, val]) => ({
      partnerId: id,
      partnerName: val.name,
      amount: Math.round(val.amount * 100) / 100,
    }));

    // 3. Partner Reimbursement Balances
    const partnerReimbursements = await getAllPartnersReimbursements(workspace._id);
    const totalOutstandingReimbursement = Math.round(
      partnerReimbursements.reduce((acc, curr) => acc + curr.outstandingReimbursement, 0) * 100
    ) / 100;

    // 4. Goals and Tasks
    const totalGoals = await Goal.countDocuments({ workspace: workspace._id });
    const allTasks = await Task.find({ workspace: workspace._id });
    const completedTasks = allTasks.filter((t) => t.isCompleted).length;
    const pendingTasks = allTasks.length - completedTasks;

    // 5. Recent Financial Activity
    const recentTransactions = await WalletTransaction.find({ workspace: workspace._id })
      .populate('wallet', 'name')
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(6);

    const formattedRecentTxns = recentTransactions.map((t: any) => ({
      id: t._id,
      transactionId: t.transactionId,
      walletName: t.wallet?.name || 'Wallet',
      type: t.type,
      amount: t.amount,
      date: t.date,
      description: t.description,
      resultingBalance: t.resultingBalance,
    }));

    const recentExpenses = await Expense.find({ workspace: workspace._id })
      .populate('payingPartner', 'name')
      .populate('companyWallet', 'name')
      .sort({ expenseDate: -1, createdAt: -1 })
      .limit(5);

    const formattedRecentExpenses = recentExpenses.map((e: any) => ({
      id: e._id,
      paymentId: e.paymentId,
      title: e.title,
      amount: e.amount,
      expenseDate: e.expenseDate,
      category: e.category,
      paymentSourceType: e.paymentSourceType,
      payerName:
        e.paymentSourceType === 'personal'
          ? e.payingPartner?.name
          : e.companyWallet?.name,
    }));

    res.json({
      funds: {
        totalCompanyFunds,
        cashBalance,
        walletBalances,
      },
      expenses: {
        totalBusinessExpenses,
        totalCompanyPaid,
        partnerSpending,
        totalOutstandingReimbursement,
        partnerReimbursements,
      },
      tasks: {
        totalGoals,
        totalTasks: allTasks.length,
        completedTasks,
        pendingTasks,
      },
      recentTransactions: formattedRecentTxns,
      recentExpenses: formattedRecentExpenses,
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to calculate dashboard statistics.' });
  }
});

export default router;
