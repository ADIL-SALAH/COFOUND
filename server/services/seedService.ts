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
import { recordOpeningBalance, recordCompanyExpensePayment } from './ledgerService.ts';
import { generateSequenceId } from './sequenceService.ts';
import { processSettlement } from './reimbursementService.ts';

export async function ensureDefaultSeed(): Promise<void> {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    return; // Already populated
  }

  console.log('Database is empty. Seeding initial demo workspace...');

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

  // 4. Goals & Tasks
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

  // 5. Seed Real Expenses
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

  // 6. Partial reimbursement of ₹1,000 to Adil from Company Cash
  await processSettlement(
    workspace._id,
    partnerA._id,
    cashWallet._id,
    1000,
    new Date(Date.now() - 1 * 86400000),
    'Partial reimbursement for logo design expense',
    partnerA._id
  );

  console.log('Default workspace successfully seeded and ready.');
}
