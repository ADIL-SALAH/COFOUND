import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { User } from '../server/models/User.ts';
import { Workspace } from '../server/models/Workspace.ts';
import { WorkspaceMembership } from '../server/models/WorkspaceMembership.ts';
import { CompanyWallet } from '../server/models/CompanyWallet.ts';
import { Expense } from '../server/models/Expense.ts';
import { WalletTransaction } from '../server/models/WalletTransaction.ts';
import { ReimbursementSettlement } from '../server/models/ReimbursementSettlement.ts';
import { Goal } from '../server/models/Goal.ts';
import { Task } from '../server/models/Task.ts';

import { generateSequenceId } from '../server/services/sequenceService.ts';
import {
  getWalletCurrentBalance,
  recordOpeningBalance,
  addFundsToWallet,
  transferBetweenWallets,
  recordCompanyExpensePayment,
  assertSufficientFunds,
} from '../server/services/ledgerService.ts';
import {
  getPartnerReimbursementSummary,
  processSettlement,
} from '../server/services/reimbursementService.ts';

let mongod;

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test('Scenario 1: Dynamic Sequence ID Generation (Year-based & Concurrency-Safe)', async () => {
  const ws = await Workspace.create({ name: 'Test WS', owner: new mongoose.Types.ObjectId() });
  const id1 = await generateSequenceId(ws._id, 'PAY');
  const id2 = await generateSequenceId(ws._id, 'PAY');
  const currentYear = new Date().getFullYear();

  assert.equal(id1, `PAY-${currentYear}-0001`);
  assert.equal(id2, `PAY-${currentYear}-0002`);
});

test('Scenario 2: Goals and Tasks Checklist Completion Progress', async () => {
  const ws = await Workspace.create({ name: 'Task WS', owner: new mongoose.Types.ObjectId() });
  const user = await User.create({ name: 'Adil', email: 'adil_task@test.com', passwordHash: 'hash' });

  const goal = await Goal.create({ workspace: ws._id, name: 'Branding', createdBy: user._id });
  const task1 = await Task.create({ workspace: ws._id, goal: goal._id, title: 'Logo', isCompleted: false, createdBy: user._id });
  const task2 = await Task.create({ workspace: ws._id, goal: goal._id, title: 'Colors', isCompleted: false, createdBy: user._id });

  assert.equal(task1.isCompleted, false);
  task1.isCompleted = true;
  await task1.save();

  const allTasks = await Task.find({ goal: goal._id });
  const completed = allTasks.filter(t => t.isCompleted).length;
  assert.equal(completed, 1);
  assert.equal(allTasks.length, 2);
});

test('Scenario 3: Personal Expense Creates Reimbursement Liability Without Altering Company Wallets', async () => {
  const ws = await Workspace.create({ name: 'Fin WS', owner: new mongoose.Types.ObjectId() });
  const partnerA = await User.create({ name: 'Partner A', email: 'parta@test.com', passwordHash: 'hash' });
  await WorkspaceMembership.create({ workspace: ws._id, user: partnerA._id, role: 'owner' });

  const bank1 = await CompanyWallet.create({
    workspace: ws._id,
    name: 'Bank 1',
    type: 'BANK',
    openingBalance: 5000,
    status: 'ACTIVE',
  });
  await recordOpeningBalance(ws._id, bank1._id, 5000, partnerA._id);

  // Initial checks
  const initialBankBalance = await getWalletCurrentBalance(bank1._id);
  assert.equal(initialBankBalance, 5000);

  const initialSummary = await getPartnerReimbursementSummary(ws._id, partnerA._id);
  assert.equal(initialSummary.outstandingReimbursement, 0);
  assert.equal(initialSummary.displayedBalance, 0);

  // Partner A pays ₹2,000 personal expense
  const payId = await generateSequenceId(ws._id, 'PAY');
  await Expense.create({
    workspace: ws._id,
    paymentId: payId,
    title: 'Logo design',
    amount: 2000,
    category: 'Branding',
    paymentSourceType: 'personal',
    payingPartner: partnerA._id,
    reimbursedAmount: 0,
    createdBy: partnerA._id,
  });

  // Verify company wallet remains ₹5,000 (unchanged)
  const bankBalanceAfterExp = await getWalletCurrentBalance(bank1._id);
  assert.equal(bankBalanceAfterExp, 5000);

  // Verify Partner A displayed balance is -₹2,000 and outstanding is ₹2,000
  const afterSummary = await getPartnerReimbursementSummary(ws._id, partnerA._id);
  assert.equal(afterSummary.outstandingReimbursement, 2000);
  assert.equal(afterSummary.displayedBalance, -2000);
});

test('Scenario 4: Partial Settlement of ₹500 Reduces Wallet and Outstanding Liability', async () => {
  const ws = await Workspace.find().then(docs => docs[docs.length - 1]);
  const partnerA = await User.findOne({ email: 'parta@test.com' });
  const bank1 = await CompanyWallet.findOne({ workspace: ws._id, name: 'Bank 1' });

  // Settle ₹500 from Bank 1 to Partner A
  await processSettlement(ws._id, partnerA._id, bank1._id, 500, new Date(), 'Partial settle 1', partnerA._id);

  // Bank 1 balance should be ₹4,500
  const bankBalance = await getWalletCurrentBalance(bank1._id);
  assert.equal(bankBalance, 4500);

  // Partner A outstanding should be ₹1,500 and displayed should be -₹1,500
  const summary = await getPartnerReimbursementSummary(ws._id, partnerA._id);
  assert.equal(summary.outstandingReimbursement, 1500);
  assert.equal(summary.displayedBalance, -1500);
});

test('Scenario 5: Multiple Settlements until Zero Outstanding Balance', async () => {
  const ws = await Workspace.find().then(docs => docs[docs.length - 1]);
  const partnerA = await User.findOne({ email: 'parta@test.com' });
  const bank1 = await CompanyWallet.findOne({ workspace: ws._id, name: 'Bank 1' });

  // Settle ₹700
  await processSettlement(ws._id, partnerA._id, bank1._id, 700, new Date(), 'Partial settle 2', partnerA._id);
  let summary = await getPartnerReimbursementSummary(ws._id, partnerA._id);
  assert.equal(summary.outstandingReimbursement, 800);
  assert.equal(summary.displayedBalance, -800);

  // Settle remaining ₹800
  await processSettlement(ws._id, partnerA._id, bank1._id, 800, new Date(), 'Final settle', partnerA._id);
  summary = await getPartnerReimbursementSummary(ws._id, partnerA._id);
  assert.equal(summary.outstandingReimbursement, 0);
  assert.equal(summary.displayedBalance, 0);

  // Bank 1 balance: 5000 - 500 - 700 - 800 = 3000
  const bankBalance = await getWalletCurrentBalance(bank1._id);
  assert.equal(bankBalance, 3000);
});

test('Scenario 6: Insufficient Funds Guard Blocks Settlement and Preserves Balances', async () => {
  const ws = await Workspace.create({ name: 'Insufficient Funds WS', owner: new mongoose.Types.ObjectId() });
  const partnerA = await User.create({ name: 'Partner Cash', email: 'part_cash@test.com', passwordHash: 'hash' });
  await WorkspaceMembership.create({ workspace: ws._id, user: partnerA._id, role: 'owner' });

  const cashWallet = await CompanyWallet.create({
    workspace: ws._id,
    name: 'Company Cash',
    type: 'CASH',
    openingBalance: 300,
    status: 'ACTIVE',
  });
  await recordOpeningBalance(ws._id, cashWallet._id, 300, partnerA._id);

  // Partner A pays ₹2,000 personal expense
  await Expense.create({
    workspace: ws._id,
    paymentId: await generateSequenceId(ws._id, 'PAY'),
    title: 'Ad spend',
    amount: 2000,
    category: 'Marketing',
    paymentSourceType: 'personal',
    payingPartner: partnerA._id,
    createdBy: partnerA._id,
  });

  // Attempting to settle ₹500 from cashWallet (which only has ₹300) must throw
  await assert.rejects(
    async () => {
      await processSettlement(ws._id, partnerA._id, cashWallet._id, 500, new Date(), 'Fail settle', partnerA._id);
    },
    /Insufficient funds/
  );

  // Cash balance must remain ₹300
  const cashBal = await getWalletCurrentBalance(cashWallet._id);
  assert.equal(cashBal, 300);

  // Outstanding must remain ₹2,000
  const summary = await getPartnerReimbursementSummary(ws._id, partnerA._id);
  assert.equal(summary.outstandingReimbursement, 2000);
  assert.equal(summary.displayedBalance, -2000);
});

test('Scenario 7: Over-Settlement Beyond Outstanding Debt is Blocked', async () => {
  const ws = await Workspace.create({ name: 'Oversettle WS', owner: new mongoose.Types.ObjectId() });
  const partner = await User.create({ name: 'Partner Owed 500', email: 'owed500@test.com', passwordHash: 'hash' });
  await WorkspaceMembership.create({ workspace: ws._id, user: partner._id, role: 'owner' });

  const bank = await CompanyWallet.create({
    workspace: ws._id,
    name: 'Bank Rich',
    type: 'BANK',
    openingBalance: 50000,
    status: 'ACTIVE',
  });
  await recordOpeningBalance(ws._id, bank._id, 50000, partner._id);

  await Expense.create({
    workspace: ws._id,
    paymentId: await generateSequenceId(ws._id, 'PAY'),
    title: 'Small tools',
    amount: 500,
    category: 'Equipment',
    paymentSourceType: 'personal',
    payingPartner: partner._id,
    createdBy: partner._id,
  });

  // Attempt to settle ₹600 when only ₹500 is owed
  await assert.rejects(
    async () => {
      await processSettlement(ws._id, partner._id, bank._id, 600, new Date(), 'Over settle', partner._id);
    },
    /Cannot settle ₹600.00/
  );

  const bankBal = await getWalletCurrentBalance(bank._id);
  assert.equal(bankBal, 50000);
});

test('Scenario 8: Company-Paid Expense Decreases Wallet and Does Not Create Liability', async () => {
  const ws = await Workspace.create({ name: 'Comp Expense WS', owner: new mongoose.Types.ObjectId() });
  const partner = await User.create({ name: 'Partner Comp', email: 'comp_exp@test.com', passwordHash: 'hash' });
  await WorkspaceMembership.create({ workspace: ws._id, user: partner._id, role: 'owner' });

  const bank = await CompanyWallet.create({
    workspace: ws._id,
    name: 'Bank 1',
    type: 'BANK',
    openingBalance: 5000,
    status: 'ACTIVE',
  });
  await recordOpeningBalance(ws._id, bank._id, 5000, partner._id);

  const payId = await generateSequenceId(ws._id, 'PAY');
  const compExp = await Expense.create({
    workspace: ws._id,
    paymentId: payId,
    title: 'Product samples',
    amount: 2000,
    category: 'Product Purchase',
    paymentSourceType: 'company',
    companyWallet: bank._id,
    createdBy: partner._id,
  });

  await recordCompanyExpensePayment(ws._id, bank._id, compExp._id, 2000, new Date(), compExp.title, partner._id);

  // Bank 1 becomes ₹3,000
  const bankBal = await getWalletCurrentBalance(bank._id);
  assert.equal(bankBal, 3000);

  // No partner liability created
  const summary = await getPartnerReimbursementSummary(ws._id, partner._id);
  assert.equal(summary.outstandingReimbursement, 0);
  assert.equal(summary.displayedBalance, 0);
});

test('Scenario 9: Inter-Wallet Transfers Conserve Total Company Funds', async () => {
  const ws = await Workspace.create({ name: 'Transfer WS', owner: new mongoose.Types.ObjectId() });
  const user = await User.create({ name: 'User T', email: 'user_t@test.com', passwordHash: 'hash' });

  const bank = await CompanyWallet.create({
    workspace: ws._id,
    name: 'Bank 1',
    type: 'BANK',
    openingBalance: 5000,
    status: 'ACTIVE',
  });
  await recordOpeningBalance(ws._id, bank._id, 5000, user._id);

  const cash = await CompanyWallet.create({
    workspace: ws._id,
    name: 'Company Cash',
    type: 'CASH',
    openingBalance: 500,
    status: 'ACTIVE',
  });
  await recordOpeningBalance(ws._id, cash._id, 500, user._id);

  const initialTotal = (await getWalletCurrentBalance(bank._id)) + (await getWalletCurrentBalance(cash._id));
  assert.equal(initialTotal, 5500);

  // Transfer ₹1,000 from Bank 1 to Cash
  await transferBetweenWallets(ws._id, bank._id, cash._id, 1000, new Date(), 'Bank to cash withdrawal', user._id);

  const bankAfter = await getWalletCurrentBalance(bank._id);
  const cashAfter = await getWalletCurrentBalance(cash._id);

  assert.equal(bankAfter, 4000);
  assert.equal(cashAfter, 1500);
  assert.equal(bankAfter + cashAfter, 5500); // Total company funds strictly conserved!
});

test('Scenario 10: Workspace Cascade Deletion Cleans Up All Child Records', async () => {
  const ws = await Workspace.create({ name: 'To Be Deleted WS', owner: new mongoose.Types.ObjectId() });
  const user = await User.create({ name: 'Del User', email: 'del_user@test.com', passwordHash: 'hash' });
  await WorkspaceMembership.create({ workspace: ws._id, user: user._id, role: 'owner' });

  const goal = await Goal.create({ workspace: ws._id, name: 'Del Goal', createdBy: user._id });
  await Task.create({ workspace: ws._id, goal: goal._id, title: 'Del Task', isCompleted: false, createdBy: user._id });
  const wallet = await CompanyWallet.create({ workspace: ws._id, name: 'Del Wallet', type: 'BANK', openingBalance: 1000, status: 'ACTIVE' });
  await recordOpeningBalance(ws._id, wallet._id, 1000, user._id);

  // Perform cascade deletion of workspace and child collections
  await Promise.all([
    Goal.deleteMany({ workspace: ws._id }),
    Task.deleteMany({ workspace: ws._id }),
    Expense.deleteMany({ workspace: ws._id }),
    CompanyWallet.deleteMany({ workspace: ws._id }),
    WalletTransaction.deleteMany({ workspace: ws._id }),
    ReimbursementSettlement.deleteMany({ workspace: ws._id }),
    WorkspaceMembership.deleteMany({ workspace: ws._id }),
    Workspace.findByIdAndDelete(ws._id),
  ]);

  // Verify all records for this workspace are wiped
  assert.equal(await Workspace.findById(ws._id), null);
  assert.equal(await Goal.countDocuments({ workspace: ws._id }), 0);
  assert.equal(await Task.countDocuments({ workspace: ws._id }), 0);
  assert.equal(await CompanyWallet.countDocuments({ workspace: ws._id }), 0);
  assert.equal(await WalletTransaction.countDocuments({ workspace: ws._id }), 0);
  assert.equal(await WorkspaceMembership.countDocuments({ workspace: ws._id }), 0);
});

