import mongoose, { Schema, Document, Types } from 'mongoose';

export type TransactionType =
  | 'OPENING_BALANCE'
  | 'FUNDS_ADDED'
  | 'COMPANY_PAID_EXPENSE'
  | 'REIMBURSEMENT_SETTLEMENT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'REVERSAL';

export interface IWalletTransaction extends Document {
  workspace: Types.ObjectId;
  transactionId: string;
  wallet: Types.ObjectId;
  type: TransactionType;
  amount: number;
  date: Date;
  description?: string;
  relatedExpense?: Types.ObjectId;
  relatedSettlement?: Types.ObjectId;
  transferGroupId?: string;
  source?: string;
  resultingBalance: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      index: true,
    },
    wallet: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyWallet',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'OPENING_BALANCE',
        'FUNDS_ADDED',
        'COMPANY_PAID_EXPENSE',
        'REIMBURSEMENT_SETTLEMENT',
        'TRANSFER_OUT',
        'TRANSFER_IN',
        'REVERSAL',
      ],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Transaction amount must be greater than zero'],
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    relatedExpense: {
      type: Schema.Types.ObjectId,
      ref: 'Expense',
      index: true,
    },
    relatedSettlement: {
      type: Schema.Types.ObjectId,
      ref: 'ReimbursementSettlement',
      index: true,
    },
    transferGroupId: {
      type: String,
      index: true,
    },
    source: {
      type: String,
      trim: true,
    },
    resultingBalance: {
      type: Number,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

WalletTransactionSchema.index({ workspace: 1, transactionId: 1 }, { unique: true });

export const WalletTransaction = mongoose.model<IWalletTransaction>(
  'WalletTransaction',
  WalletTransactionSchema
);
