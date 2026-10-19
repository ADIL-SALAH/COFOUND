import { Types } from 'mongoose';
import { CompanyWallet } from '../models/CompanyWallet.ts';
import { WalletTransaction, type TransactionType } from '../models/WalletTransaction.ts';
import { generateSequenceId } from './sequenceService.ts';

export async function getWalletCurrentBalance(
  walletId: Types.ObjectId | string
): Promise<number> {
  const transactions = await WalletTransaction.find({
    wallet: new Types.ObjectId(walletId.toString()),
  }).sort({ date: 1, createdAt: 1 });

  let balance = 0;
  for (const txn of transactions) {
    if (['OPENING_BALANCE', 'FUNDS_ADDED', 'TRANSFER_IN'].includes(txn.type)) {
      balance += txn.amount;
    } else if (
      ['COMPANY_PAID_EXPENSE', 'REIMBURSEMENT_SETTLEMENT', 'TRANSFER_OUT'].includes(
        txn.type
      )
    ) {
      balance -= txn.amount;
    } else if (txn.type === 'REVERSAL') {
      balance += txn.amount; // Signed adjustment if any
    }
  }

  return Math.round(balance * 100) / 100;
}

export async function assertSufficientFunds(
  walletId: Types.ObjectId | string,
  requiredAmount: number
): Promise<number> {
  const currentBalance = await getWalletCurrentBalance(walletId);
  const roundedRequired = Math.round(requiredAmount * 100) / 100;

  if (currentBalance < roundedRequired) {
    throw new Error(
      `Insufficient funds in wallet. Available: ₹${currentBalance.toFixed(
        2
      )}, required: ₹${roundedRequired.toFixed(2)}`
    );
  }

  return currentBalance;
}

export async function recordOpeningBalance(
  workspaceId: Types.ObjectId | string,
  walletId: Types.ObjectId | string,
  amount: number,
  userId: Types.ObjectId | string
): Promise<void> {
  if (amount <= 0) return;

  const transactionId = await generateSequenceId(workspaceId, 'TXN');
  await WalletTransaction.create({
    workspace: new Types.ObjectId(workspaceId.toString()),
    transactionId,
    wallet: new Types.ObjectId(walletId.toString()),
    type: 'OPENING_BALANCE',
    amount: Math.round(amount * 100) / 100,
    date: new Date(),
    description: 'Initial opening balance',
    resultingBalance: Math.round(amount * 100) / 100,
    createdBy: new Types.ObjectId(userId.toString()),
  });
}

export async function addFundsToWallet(
  workspaceId: Types.ObjectId | string,
  walletId: Types.ObjectId | string,
  amount: number,
  date: Date,
  source: string,
  description: string | undefined,
  userId: Types.ObjectId | string
) {
  const wallet = await CompanyWallet.findOne({
    _id: walletId,
    workspace: workspaceId,
    status: 'ACTIVE',
  });
  if (!wallet) {
    throw new Error('Wallet not found or is inactive');
  }

  const roundedAmount = Math.round(amount * 100) / 100;
  if (roundedAmount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  const currentBalance = await getWalletCurrentBalance(walletId);
  const resultingBalance = Math.round((currentBalance + roundedAmount) * 100) / 100;

  const transactionId = await generateSequenceId(workspaceId, 'TXN');
  const txn = await WalletTransaction.create({
    workspace: new Types.ObjectId(workspaceId.toString()),
    transactionId,
    wallet: new Types.ObjectId(walletId.toString()),
    type: 'FUNDS_ADDED',
    amount: roundedAmount,
    date: date || new Date(),
    source,
    description: description || `Funds added from ${source}`,
    resultingBalance,
    createdBy: new Types.ObjectId(userId.toString()),
  });

  return txn;
}

export async function transferBetweenWallets(
  workspaceId: Types.ObjectId | string,
  fromWalletId: Types.ObjectId | string,
  toWalletId: Types.ObjectId | string,
  amount: number,
  date: Date,
  notes: string | undefined,
  userId: Types.ObjectId | string
) {
  if (fromWalletId.toString() === toWalletId.toString()) {
    throw new Error('Source and destination wallets cannot be the same');
  }

  const fromWallet = await CompanyWallet.findOne({
    _id: fromWalletId,
    workspace: workspaceId,
    status: 'ACTIVE',
  });
  if (!fromWallet) throw new Error('Source wallet not found or is inactive');

  const toWallet = await CompanyWallet.findOne({
    _id: toWalletId,
    workspace: workspaceId,
    status: 'ACTIVE',
  });
  if (!toWallet) throw new Error('Destination wallet not found or is inactive');

  const roundedAmount = Math.round(amount * 100) / 100;
  if (roundedAmount <= 0) {
    throw new Error('Transfer amount must be greater than zero');
  }

  // Guard against negative balance
  const fromBalance = await assertSufficientFunds(fromWalletId, roundedAmount);
  const toBalance = await getWalletCurrentBalance(toWalletId);

  const transferGroupId = `TRF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const outTxnId = await generateSequenceId(workspaceId, 'TXN');
  const inTxnId = await generateSequenceId(workspaceId, 'TXN');

  const outResulting = Math.round((fromBalance - roundedAmount) * 100) / 100;
  const inResulting = Math.round((toBalance + roundedAmount) * 100) / 100;

  const transferOut = await WalletTransaction.create({
    workspace: new Types.ObjectId(workspaceId.toString()),
    transactionId: outTxnId,
    wallet: new Types.ObjectId(fromWalletId.toString()),
    type: 'TRANSFER_OUT',
    amount: roundedAmount,
    date: date || new Date(),
    description: notes || `Transfer to ${toWallet.name}`,
    transferGroupId,
    resultingBalance: outResulting,
    createdBy: new Types.ObjectId(userId.toString()),
  });

  const transferIn = await WalletTransaction.create({
    workspace: new Types.ObjectId(workspaceId.toString()),
    transactionId: inTxnId,
    wallet: new Types.ObjectId(toWalletId.toString()),
    type: 'TRANSFER_IN',
    amount: roundedAmount,
    date: date || new Date(),
    description: notes || `Transfer from ${fromWallet.name}`,
    transferGroupId,
    resultingBalance: inResulting,
    createdBy: new Types.ObjectId(userId.toString()),
  });

  return { transferOut, transferIn, transferGroupId };
}

export async function recordCompanyExpensePayment(
  workspaceId: Types.ObjectId | string,
  walletId: Types.ObjectId | string,
  expenseId: Types.ObjectId | string,
  amount: number,
  date: Date,
  title: string,
  userId: Types.ObjectId | string
) {
  const roundedAmount = Math.round(amount * 100) / 100;
  const currentBalance = await assertSufficientFunds(walletId, roundedAmount);
  const resultingBalance = Math.round((currentBalance - roundedAmount) * 100) / 100;

  const transactionId = await generateSequenceId(workspaceId, 'TXN');
  const txn = await WalletTransaction.create({
    workspace: new Types.ObjectId(workspaceId.toString()),
    transactionId,
    wallet: new Types.ObjectId(walletId.toString()),
    type: 'COMPANY_PAID_EXPENSE',
    amount: roundedAmount,
    date: date || new Date(),
    description: `Expense: ${title}`,
    relatedExpense: new Types.ObjectId(expenseId.toString()),
    resultingBalance,
    createdBy: new Types.ObjectId(userId.toString()),
  });

  return txn;
}
