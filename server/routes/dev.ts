import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.ts';
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
import { recordOpeningBalance, recordCompanyExpensePayment } from '../services/ledgerService.ts';
import { generateSequenceId } from '../services/sequenceService.ts';
import { processSettlement } from '../services/reimbursementService.ts';

const router = Router();

// POST /api/dev/seed - Populate realistic dual-partner seed data
router.post('/seed', async (_req: Request, res: Response) => {
  try {
    console.log('Clearing existing database collections for fresh seed...');
    await Promise.all([
      User.deleteMany({}),
      Workspace.deleteMany({}),
      WorkspaceMembership.deleteMany({}),
      WorkspaceInvitation.deleteMany({}),
      CompanyWallet.deleteMany({}),
      Goal.deleteMany({}),
      Task.deleteMany({}),
      Expense.deleteMany({}),
      WalletTransaction.deleteMany({}),
      ReimbursementSettlement.deleteMany({}),
      SequenceCounter.deleteMany({}),
    ]);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 1. Create Partner A & Partner B
    const partnerA = await User.create({
      name: 'Adil Salah',
      email: 'adil@cofound.demo',
      passwordHash,
      phone: '+91 98765 43210',
    });

    const partnerB = await User.create({
      name: 'Rohan Mehta',
      email: 'rohan@cofound.demo',
      passwordHash,
      phone: '+91 98123 45678',
    });

    // 2. Create Shared Workspace
    const workspace = await Workspace.create({
      name: 'Apex Ventures',
      owner: partnerA._id,
    });

    // Memberships
    await WorkspaceMembership.create([
      { workspace: workspace._id, user: partnerA._id, role: 'owner' },
      { workspace: workspace._id, user: partnerB._id, role: 'member' },
    ]);

    // Active Invite Code
    const inviteCode = 'APEX26';
    await WorkspaceInvitation.create({
      workspace: workspace._id,
      inviteCode,
      role: 'member',
      createdBy: partnerA._id,
      status: 'ACTIVE',
    });

    // 3. Create Default Company Wallets with Opening Balances
    const cashWallet = await CompanyWallet.create({
      workspace: workspace._id,
      name: 'Company Cash',
      type: 'CASH',
      openingBalance: 5000,
      status: 'ACTIVE',
    });
    await recordOpeningBalance(workspace._id, cashWallet._id, 5000, partnerA._id);

    const bank1 = await CompanyWallet.create({
      workspace: workspace._id,
      name: 'Company Bank 1',
      type: 'BANK',
      openingBalance: 35000,
      status: 'ACTIVE',
    });
    await recordOpeningBalance(workspace._id, bank1._id, 35000, partnerA._id);

    const bank2 = await CompanyWallet.create({
      workspace: workspace._id,
      name: 'Company Bank 2',
      type: 'BANK',
      openingBalance: 20000,
      status: 'ACTIVE',
    });
    await recordOpeningBalance(workspace._id, bank2._id, 20000, partnerA._id);

    // 4. Goals & Checklist Tasks
    const brandingGoal = await Goal.create({
      workspace: workspace._id,
      name: 'Branding',
      createdBy: partnerA._id,
    });
    await Task.create([
      {
        workspace: workspace._id,
        goal: brandingGoal._id,
        title: 'Finalize brand name',
        isCompleted: true,
        createdBy: partnerA._id,
        completedBy: partnerA._id,
        completedAt: new Date(Date.now() - 3 * 86400000),
      },
      {
        workspace: workspace._id,
        goal: brandingGoal._id,
        title: 'Select brand colors',
        isCompleted: true,
        createdBy: partnerA._id,
        completedBy: partnerB._id,
        completedAt: new Date(Date.now() - 2 * 86400000),
      },
      {
        workspace: workspace._id,
        goal: brandingGoal._id,
        title: 'Design logo & collateral',
        isCompleted: false,
        createdBy: partnerB._id,
      },
    ]);

    const productGoal = await Goal.create({
      workspace: workspace._id,
      name: 'Product Research',
      createdBy: partnerB._id,
    });
    await Task.create([
      {
        workspace: workspace._id,
        goal: productGoal._id,
        title: 'Research top 5 competitors',
        isCompleted: true,
        createdBy: partnerB._id,
        completedBy: partnerB._id,
        completedAt: new Date(Date.now() - 1 * 86400000),
      },
      {
        workspace: workspace._id,
        goal: productGoal._id,
        title: 'Identify initial prototype products',
        isCompleted: false,
        createdBy: partnerA._id,
      },
      {
        workspace: workspace._id,
        goal: productGoal._id,
        title: 'Request supplier pricing quotes',
        isCompleted: false,
        createdBy: partnerB._id,
      },
    ]);

    const webGoal = await Goal.create({
      workspace: workspace._id,
      name: 'Website Development',
      createdBy: partnerA._id,
    });
    await Task.create([
      {
        workspace: workspace._id,
        goal: webGoal._id,
        title: 'Configure domain and SSL',
        isCompleted: false,
        createdBy: partnerA._id,
      },
      {
        workspace: workspace._id,
        goal: webGoal._id,
        title: 'Draft landing page wireframe',
        isCompleted: false,
        createdBy: partnerA._id,
      },
    ]);

    // 5. Seed Real Expenses
    // Expense 1: Partner A pays personal ₹2,000 for Logo design
    const pay1 = await generateSequenceId(workspace._id, 'PAY');
    await Expense.create({
      workspace: workspace._id,
      paymentId: pay1,
      title: 'Logo design & vector export',
      amount: 2000,
      expenseDate: new Date(Date.now() - 4 * 86400000),
      category: 'Branding',
      paymentSourceType: 'personal',
      payingPartner: partnerA._id,
      description: 'Paid to freelance graphic designer via UPI',
      reimbursedAmount: 0,
      createdBy: partnerA._id,
    });

    // Expense 2: Partner B pays personal ₹1,500 for Packaging samples
    const pay2 = await generateSequenceId(workspace._id, 'PAY');
    await Expense.create({
      workspace: workspace._id,
      paymentId: pay2,
      title: 'Sample packaging boxes & bubble wrap',
      amount: 1500,
      expenseDate: new Date(Date.now() - 3 * 86400000),
      category: 'Packaging',
      paymentSourceType: 'personal',
      payingPartner: partnerB._id,
      description: 'Sample packaging batch',
      reimbursedAmount: 0,
      createdBy: partnerB._id,
    });

    // Expense 3: Company pays ₹5,000 directly from Bank 1 for Product purchase
    const pay3 = await generateSequenceId(workspace._id, 'PAY');
    const compExp = await Expense.create({
      workspace: workspace._id,
      paymentId: pay3,
      title: 'Initial sample product procurement',
      amount: 5000,
      expenseDate: new Date(Date.now() - 2 * 86400000),
      category: 'Product Purchase',
      paymentSourceType: 'company',
      companyWallet: bank1._id,
      description: 'Direct vendor transfer from Company Bank 1',
      reimbursedAmount: 0,
      createdBy: partnerA._id,
    });
    await recordCompanyExpensePayment(
      workspace._id,
      bank1._id,
      compExp._id,
      5000,
      new Date(Date.now() - 2 * 86400000),
      compExp.title,
      partnerA._id
    );

    // 6. Settle ₹1,000 partial reimbursement to Partner A from Company Cash
    // Adil was owed ₹2,000. Company settles ₹1,000 from Cash. Outstanding becomes ₹1,000.
    await processSettlement(
      workspace._id,
      partnerA._id,
      cashWallet._id,
      1000,
      new Date(Date.now() - 1 * 86400000),
      'Partial reimbursement for logo design expense',
      partnerA._id
    );

    res.json({
      message: 'Demo workspace successfully seeded with two partners!',
      credentials: [
        {
          role: 'Owner (Partner A)',
          name: 'Adil Salah',
          email: 'adil@cofound.demo',
          password: 'password123',
        },
        {
          role: 'Member (Partner B)',
          name: 'Rohan Mehta',
          email: 'rohan@cofound.demo',
          password: 'password123',
        },
      ],
      workspace: {
        id: workspace._id,
        name: workspace.name,
        inviteCode,
      },
    });
  } catch (err: any) {
    console.error('Seeding error:', err);
    res.status(500).json({ error: err.message || 'Seeding failed.' });
  }
});

// GET /api/dev/status - Check database connectivity and counts
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const userCount = await User.countDocuments();
    const workspaceCount = await Workspace.countDocuments();
    const expenseCount = await Expense.countDocuments();
    const walletCount = await CompanyWallet.countDocuments();
    const txnCount = await WalletTransaction.countDocuments();

    res.json({
      status: 'online',
      counts: {
        users: userCount,
        workspaces: workspaceCount,
        expenses: expenseCount,
        wallets: walletCount,
        transactions: txnCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

export default router;
