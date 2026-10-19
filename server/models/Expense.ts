import mongoose, { Schema, Document, Types } from 'mongoose';

export type PaymentSourceType = 'personal' | 'company';

export interface IReceiptMeta {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

export interface IExpense extends Document {
  workspace: Types.ObjectId;
  paymentId: string;
  title: string;
  amount: number;
  expenseDate: Date;
  category: string;
  paymentSourceType: PaymentSourceType;
  payingPartner?: Types.ObjectId;
  companyWallet?: Types.ObjectId;
  description?: string;
  receipt?: IReceiptMeta;
  reimbursedAmount: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptMetaSchema = new Schema<IReceiptMeta>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
  },
  { _id: false }
);

const ExpenseSchema = new Schema<IExpense>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    paymentId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    expenseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    paymentSourceType: {
      type: String,
      enum: ['personal', 'company'],
      required: true,
      index: true,
    },
    payingPartner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    companyWallet: {
      type: Schema.Types.ObjectId,
      ref: 'CompanyWallet',
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    receipt: {
      type: ReceiptMetaSchema,
    },
    reimbursedAmount: {
      type: Number,
      default: 0,
      min: [0, 'Reimbursed amount cannot be negative'],
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

ExpenseSchema.index({ workspace: 1, paymentId: 1 }, { unique: true });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
