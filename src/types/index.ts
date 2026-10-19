export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Workspace {
  id: string;
  name: string;
  role: 'owner' | 'member';
  isOwner: boolean;
  inviteCode?: string;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface Goal {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
}

export interface Task {
  id: string;
  goalId: string;
  title: string;
  isCompleted: boolean;
  createdByName: string;
  completedByName?: string;
  completedAt?: string;
  createdAt: string;
}

export interface CompanyWallet {
  id: string;
  name: string;
  type: 'CASH' | 'BANK';
  openingBalance: number;
  currentBalance: number;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  paymentId: string;
  title: string;
  amount: number;
  expenseDate: string;
  category: string;
  paymentSourceType: 'personal' | 'company';
  payingPartnerId?: string;
  payingPartnerName?: string;
  companyWalletId?: string;
  companyWalletName?: string;
  description?: string;
  hasReceipt: boolean;
  receiptName?: string;
  reimbursedAmount: number;
  outstandingReimbursement: number;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  transactionId: string;
  walletId: string;
  walletName: string;
  type:
    | 'OPENING_BALANCE'
    | 'FUNDS_ADDED'
    | 'COMPANY_PAID_EXPENSE'
    | 'REIMBURSEMENT_SETTLEMENT'
    | 'TRANSFER_OUT'
    | 'TRANSFER_IN'
    | 'REVERSAL';
  amount: number;
  date: string;
  description?: string;
  relatedPaymentId?: string;
  transferGroupId?: string;
  source?: string;
  resultingBalance: number;
  createdByName: string;
  createdAt: string;
}

export interface PartnerReimbursementSummary {
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

export interface SettlementHistoryItem {
  id: string;
  settlementId: string;
  partnerName: string;
  walletName: string;
  amount: number;
  date: string;
  notes?: string;
  createdByName: string;
  createdAt: string;
}

export interface DashboardData {
  funds: {
    totalCompanyFunds: number;
    cashBalance: number;
    walletBalances: Array<{
      id: string;
      name: string;
      type: 'CASH' | 'BANK';
      balance: number;
    }>;
  };
  expenses: {
    totalBusinessExpenses: number;
    totalCompanyPaid: number;
    partnerSpending: Array<{
      partnerId: string;
      partnerName: string;
      amount: number;
    }>;
    totalOutstandingReimbursement: number;
    partnerReimbursements: PartnerReimbursementSummary[];
  };
  tasks: {
    totalGoals: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
  };
  recentTransactions: Array<{
    id: string;
    transactionId: string;
    walletName: string;
    type: string;
    amount: number;
    date: string;
    description?: string;
    resultingBalance: number;
  }>;
  recentExpenses: Array<{
    id: string;
    paymentId: string;
    title: string;
    amount: number;
    expenseDate: string;
    category: string;
    paymentSourceType: 'personal' | 'company';
    payerName?: string;
  }>;
}
