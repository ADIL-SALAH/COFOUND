import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReimbursementSettlement extends Document {
  workspace: Types.ObjectId;
  settlementId: string;
  partner: Types.ObjectId;
  companyWallet: Types.ObjectId;
  amount: number;
  date: Date;
  notes?: string;
  transaction?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReimbursementSettlementSchema = new Schema<IReimbursementSettlement>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    settlementId: {
      type: String,
      required: true,
      index: true,
    },
    partner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyWallet: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyWallet',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Settlement amount must be greater than zero'],
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    transaction: {
      type: Schema.Types.ObjectId,
      ref: 'WalletTransaction',
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

ReimbursementSettlementSchema.index({ workspace: 1, settlementId: 1 }, { unique: true });

export const ReimbursementSettlement = mongoose.model<IReimbursementSettlement>(
  'ReimbursementSettlement',
  ReimbursementSettlementSchema
);
