import mongoose, { Schema, Document, Types } from 'mongoose';

export type WalletType = 'CASH' | 'BANK';
export type WalletStatus = 'ACTIVE' | 'INACTIVE';

export interface ICompanyWallet extends Document {
  workspace: Types.ObjectId;
  name: string;
  type: WalletType;
  openingBalance: number;
  status: WalletStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyWalletSchema = new Schema<ICompanyWallet>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Wallet name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['CASH', 'BANK'],
      default: 'BANK',
      required: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: [0, 'Opening balance cannot be negative'],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

CompanyWalletSchema.index({ workspace: 1, name: 1 }, { unique: true });

export const CompanyWallet = mongoose.model<ICompanyWallet>('CompanyWallet', CompanyWalletSchema);
