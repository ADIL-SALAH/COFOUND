export type Role = 'OWNER' | 'MEMBER';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  avatarColor: string;
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  role: Role;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: TeamMember[];
  inviteCode: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  teamId: string;
  goalId: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WalletType = 'CASH' | 'BANK';
export type WalletStatus = 'ACTIVE' | 'INACTIVE';

export interface Wallet {
  id: string;
  teamId: string;
  name: string;
  type: WalletType;
  openingBalance: number;
  currentBalance: number;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export type PaidFromType = 'PERSONAL' | 'COMPANY_WALLET';

export type ExpenseCategory =
  | 'Branding'
  | 'Product Purchase'
  | 'Sourcing'
  | 'Website and Software'
  | 'Marketing'
  | 'Packaging'
  | 'Transport'
  | 'Other';

export interface ReceiptFile {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
}

export interface Expense {
  id: string;
  teamId: string;
  paymentId: string; // e.g. PAY-2026-0001
  title: string;
  amount: number;
  expenseDate: string;
  paidFromType: PaidFromType;
  paidBy?: string; // userId if paidFromType === 'PERSONAL'
  walletId?: string; // walletId if paidFromType === 'COMPANY_WALLET'
  category: ExpenseCategory;
  receiptFile?: ReceiptFile;
  reimbursedAmount: number;
  isVoided?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | 'OPENING_BALANCE'
  | 'FUNDS_ADDED'
  | 'EXPENSE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'REIMBURSEMENT';

export type FundsSource =
  | 'Partner A contribution'
  | 'Partner B contribution'
  | 'Business income'
  | 'Other';

export interface WalletTransaction {
  id: string;
  teamId: string;
  transactionId: string; // e.g. TXN-2026-0001
  walletId: string;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  description: string;
  relatedExpenseId?: string;
  transferGroupId?: string;
  source?: FundsSource | string;
  resultingBalance: number;
  createdAt: string;
}

export interface AppDatabase {
  users: User[];
  teams: Team[];
  goals: Goal[];
  tasks: Task[];
  wallets: Wallet[];
  expenses: Expense[];
  walletTransactions: WalletTransaction[];
  counters: {
    [key: string]: number;
  };
}
