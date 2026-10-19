import { Types } from 'mongoose';
import { Expense } from '../models/Expense.ts';
import { ReimbursementSettlement } from '../models/ReimbursementSettlement.ts';
import { WalletTransaction } from '../models/WalletTransaction.ts';
import { CompanyWallet } from '../models/CompanyWallet.ts';
import { WorkspaceMembership } from '../models/WorkspaceMembership.ts';
import { User } from '../models/User.ts';
import { generateSequenceId } from './sequenceService.ts';
import { assertSufficientFunds, getWalletCurrentBalance } from './ledgerService.ts';

export interface IPartnerReimbursementSummary {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  role: string;
  totalPersonalExpenses: number;
  totalSettled: number;
  outstandingReimbursement: number;
  displayedBalance: number; // e.g. -2000
  unpaidExpensesCount: number;
}

export async function getPartnerReimbursementSummary(
  workspaceId: Types.ObjectId | string,
  partnerId: Types.ObjectId | string
): Promise<IPartnerReimbursementSummary> {
  const user = await User.findById(partnerId);
  if (!user) throw new Error('Partner not found');

  const membership = await WorkspaceMembership.findOne({
    workspace: workspaceId,
    user: partnerId,
  });

  const personalExpenses = await Expense.find({
    workspace: new Types.ObjectId(workspaceId.toString()),
    paymentSourceType: 'personal',
    payingPartner: new Types.ObjectId(partnerId.toString()),
  });

  const totalPersonalExpenses = personalExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const settlements = await ReimbursementSettlement.find({
    workspace: new Types.ObjectId(workspaceId.toString()),
    partner: new Types.ObjectId(partnerId.toString()),
  });

  const totalSettled = settlements.reduce((acc, curr) => acc + curr.amount, 0);

  const outstanding = Math.max(
    0,
    Math.round((totalPersonalExpenses - totalSettled) * 100) / 100
  );

  const unpaidCount = personalExpenses.filter(
    (e) => (e.reimbursedAmount || 0) < e.amount
  ).length;

  return {
    partnerId: user._id.toString(),
    partnerName: user.name,
    partnerEmail: user.email,
    role: membership?.role || 'member',
    totalPersonalExpenses: Math.round(totalPersonalExpenses * 100) / 100,
    totalSettled: Math.round(totalSettled * 100) / 100,
    outstandingReimbursement: outstanding,
    displayedBalance: outstanding > 0 ? -outstanding : 0,
    unpaidExpensesCount: unpaidCount,
  };
}

export async function getAllPartnersReimbursements(
  workspaceId: Types.ObjectId | string
): Promise<IPartnerReimbursementSummary[]> {
  const memberships = await WorkspaceMembership.find({
    workspace: new Types.ObjectId(workspaceId.toString()),
  }).populate('user');

  const summaries: IPartnerReimbursementSummary[] = [];
  for (const m of memberships) {
    if (m.user) {
      const summary = await getPartnerReimbursementSummary(workspaceId, m.user._id);
      summaries.push(summary);
    }
  }

  return summaries;
}

export async function processSettlement(
  workspaceId: Types.ObjectId | string,
  partnerId: Types.ObjectId | string,
  walletId: Types.ObjectId | string,
  amount: number,
  date: Date,
  notes: string | undefined,
  currentUserId: Types.ObjectId | string
) {
  const roundedAmount = Math.round(amount * 100) / 100;
  if (roundedAmount <= 0) {
    throw new Error('Settlement amount must be greater than zero');
  }

  // Verify partner summary and outstanding balance
  const summary = await getPartnerReimbursementSummary(workspaceId, partnerId);
  if (roundedAmount > summary.outstandingReimbursement) {
    throw new Error(
      `Cannot settle ₹${roundedAmount.toFixed(
        2
      )}. Outstanding reimbursement is ₹${summary.outstandingReimbursement.toFixed(2)}.`
    );
  }

  // Verify wallet
  const wallet = await CompanyWallet.findOne({
    _id: walletId,
    workspace: workspaceId,
    status: 'ACTIVE',
  });
  if (!wallet) throw new Error('Selected company wallet not found or is inactive');

  // Guard against insufficient funds
  const currentWalletBalance = await assertSufficientFunds(walletId, roundedAmount);
  const resultingWalletBalance = Math.round((currentWalletBalance - roundedAmount) * 100) / 100;

  // Generate IDs
  const settlementId = await generateSequenceId(workspaceId, 'SETTLE');
  const transactionId = await generateSequenceId(workspaceId, 'TXN');

  // 1. Create WalletTransaction
  const txn = await WalletTransaction.create({
    workspace: new Types.ObjectId(workspaceId.toString()),
    transactionId,
    wallet: new Types.ObjectId(walletId.toString()),
    type: 'REIMBURSEMENT_SETTLEMENT',
    amount: roundedAmount,
    date: date || new Date(),
    description: notes || `Reimbursement settlement for ${summary.partnerName}`,
    resultingBalance: resultingWalletBalance,
    createdBy: new Types.ObjectId(currentUserId.toString()),
  });

  // 2. Create ReimbursementSettlement
  const settlement = await ReimbursementSettlement.create({
    workspace: new Types.ObjectId(workspaceId.toString()),
    settlementId,
    partner: new Types.ObjectId(partnerId.toString()),
    companyWallet: new Types.ObjectId(walletId.toString()),
    amount: roundedAmount,
    date: date || new Date(),
    notes,
    transaction: txn._id,
    createdBy: new Types.ObjectId(currentUserId.toString()),
  });

  // Link transaction to settlement
  txn.relatedSettlement = settlement._id;
  await txn.save();

  // 3. Update reimbursedAmount across personal expenses in FIFO order
  let remainingToAllocate = roundedAmount;
  const unpaidExpenses = await Expense.find({
    workspace: new Types.ObjectId(workspaceId.toString()),
    paymentSourceType: 'personal',
    payingPartner: new Types.ObjectId(partnerId.toString()),
  }).sort({ expenseDate: 1, createdAt: 1 });

  for (const exp of unpaidExpenses) {
    if (remainingToAllocate <= 0) break;
    const currentReimbursed = exp.reimbursedAmount || 0;
    const unallocatedOnExpense = exp.amount - currentReimbursed;

    if (unallocatedOnExpense > 0) {
      const allocate = Math.min(remainingToAllocate, unallocatedOnExpense);
      exp.reimbursedAmount = Math.round((currentReimbursed + allocate) * 100) / 100;
      await exp.save();
      remainingToAllocate = Math.round((remainingToAllocate - allocate) * 100) / 100;
    }
  }

  const updatedSummary = await getPartnerReimbursementSummary(workspaceId, partnerId);

  return {
    settlement,
    transaction: txn,
    updatedPartnerSummary: updatedSummary,
    walletBalance: resultingWalletBalance,
  };
}
