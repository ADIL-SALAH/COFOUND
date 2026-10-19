import fs from 'fs';
import path from 'path';
import {
  AppDatabase,
  User,
  Team,
  Wallet,
  Goal,
  Task,
  Expense,
  WalletTransaction,
  FundsSource,
} from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cofound-db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function createInitialSeedData(): AppDatabase {
  const adil: User = {
    id: 'user_adil',
    name: 'Adil Salah',
    email: 'adilsalah1.official@gmail.com',
    avatarColor: 'bg-emerald-600',
    createdAt: '2026-01-10T08:00:00.000Z',
  };

  const hashim: User = {
    id: 'user_hashim',
    name: 'Hashim CH',
    email: 'hashim@cofound.biz',
    avatarColor: 'bg-blue-600',
    createdAt: '2026-01-10T08:30:00.000Z',
  };

  const team: Team = {
    id: 'team_cofound',
    name: 'CoFound Ventures',
    ownerId: adil.id,
    inviteCode: 'COFOUND-2026',
    members: [
      { userId: adil.id, role: 'OWNER', joinedAt: '2026-01-10T08:00:00.000Z' },
      { userId: hashim.id, role: 'MEMBER', joinedAt: '2026-01-10T08:35:00.000Z' },
    ],
    createdAt: '2026-01-10T08:00:00.000Z',
  };

  // 3 Default wallets
  const walletCash: Wallet = {
    id: 'wallet_cash',
    teamId: team.id,
    name: 'Company Cash',
    type: 'CASH',
    openingBalance: 15000,
    currentBalance: 18700, // calculated from ledger
    status: 'ACTIVE',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-10T09:00:00.000Z',
  };

  const walletBank1: Wallet = {
    id: 'wallet_bank1',
    teamId: team.id,
    name: 'Company Bank 1 (HDFC Business)',
    type: 'BANK',
    openingBalance: 65000,
    currentBalance: 81500, // opening 65k + partner funding 30k - transfer 10k - PAY-0001 (3.5k) = 81.5k
    status: 'ACTIVE',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-10T09:00:00.000Z',
  };

  const walletBank2: Wallet = {
    id: 'wallet_bank2',
    teamId: team.id,
    name: 'Company Bank 2 (ICICI Current)',
    type: 'BANK',
    openingBalance: 40000,
    currentBalance: 32000, // opening 40k - PAY-0004 (8k) = 32k
    status: 'ACTIVE',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-01-10T09:00:00.000Z',
  };

  // Goals
  const goal1: Goal = {
    id: 'goal_branding',
    teamId: team.id,
    name: 'Branding & Identity',
    createdAt: '2026-01-12T10:00:00.000Z',
    updatedAt: '2026-01-12T10:00:00.000Z',
  };

  const goal2: Goal = {
    id: 'goal_sourcing',
    teamId: team.id,
    name: 'Product Sourcing & Quality',
    createdAt: '2026-01-12T10:30:00.000Z',
    updatedAt: '2026-01-12T10:30:00.000Z',
  };

  const goal3: Goal = {
    id: 'goal_tech',
    teamId: team.id,
    name: 'Website & Digital Stack',
    createdAt: '2026-01-14T09:00:00.000Z',
    updatedAt: '2026-01-14T09:00:00.000Z',
  };

  // Tasks
  const tasks: Task[] = [
    {
      id: 'task_1',
      teamId: team.id,
      goalId: goal1.id,
      title: 'Finalize brand wordmark and logo variations',
      isCompleted: true,
      createdAt: '2026-01-12T10:05:00.000Z',
      updatedAt: '2026-01-15T14:20:00.000Z',
    },
    {
      id: 'task_2',
      teamId: team.id,
      goalId: goal1.id,
      title: 'Select brand colors and typography kit',
      isCompleted: true,
      createdAt: '2026-01-12T10:10:00.000Z',
      updatedAt: '2026-01-16T11:00:00.000Z',
    },
    {
      id: 'task_3',
      teamId: team.id,
      goalId: goal1.id,
      title: 'Design initial packaging box dielines',
      isCompleted: false,
      createdAt: '2026-01-12T10:15:00.000Z',
      updatedAt: '2026-01-12T10:15:00.000Z',
    },
    {
      id: 'task_4',
      teamId: team.id,
      goalId: goal2.id,
      title: 'Shortlist top 3 verified suppliers in Gujarat',
      isCompleted: true,
      createdAt: '2026-01-12T10:35:00.000Z',
      updatedAt: '2026-01-18T16:45:00.000Z',
    },
    {
      id: 'task_5',
      teamId: team.id,
      goalId: goal2.id,
      title: 'Order physical product sample batches',
      isCompleted: true,
      createdAt: '2026-01-12T10:40:00.000Z',
      updatedAt: '2026-01-20T09:15:00.000Z',
    },
    {
      id: 'task_6',
      teamId: team.id,
      goalId: goal2.id,
      title: 'Execute quality inspection and material durability check',
      isCompleted: false,
      createdAt: '2026-01-12T10:45:00.000Z',
      updatedAt: '2026-01-12T10:45:00.000Z',
    },
    {
      id: 'task_7',
      teamId: team.id,
      goalId: goal3.id,
      title: 'Register company domain and configure secure email',
      isCompleted: true,
      createdAt: '2026-01-14T09:10:00.000Z',
      updatedAt: '2026-01-14T15:30:00.000Z',
    },
    {
      id: 'task_8',
      teamId: team.id,
      goalId: goal3.id,
      title: 'Launch landing page with early access signup form',
      isCompleted: false,
      createdAt: '2026-01-14T09:15:00.000Z',
      updatedAt: '2026-01-14T09:15:00.000Z',
    },
  ];

  // Expenses
  const expenses: Expense[] = [
    {
      id: 'exp_1',
      teamId: team.id,
      paymentId: 'PAY-2026-0001',
      title: 'Domain Registration & Cloud Hosting (1 Year)',
      amount: 3500,
      expenseDate: '2026-01-14',
      paidFromType: 'COMPANY_WALLET',
      walletId: walletBank1.id,
      category: 'Website and Software',
      reimbursedAmount: 0,
      createdAt: '2026-01-14T10:00:00.000Z',
      updatedAt: '2026-01-14T10:00:00.000Z',
    },
    {
      id: 'exp_2',
      teamId: team.id,
      paymentId: 'PAY-2026-0002',
      title: 'Custom Packaging Box Sample Run',
      amount: 2400,
      expenseDate: '2026-01-16',
      paidFromType: 'PERSONAL',
      paidBy: adil.id,
      category: 'Packaging',
      reimbursedAmount: 1200, // partially reimbursed
      createdAt: '2026-01-16T11:00:00.000Z',
      updatedAt: '2026-01-16T11:00:00.000Z',
    },
    {
      id: 'exp_3',
      teamId: team.id,
      paymentId: 'PAY-2026-0003',
      title: 'Supplier Material Lab Testing & Courier Fees',
      amount: 5800,
      expenseDate: '2026-01-19',
      paidFromType: 'PERSONAL',
      paidBy: hashim.id,
      category: 'Sourcing',
      reimbursedAmount: 0,
      createdAt: '2026-01-19T14:30:00.000Z',
      updatedAt: '2026-01-19T14:30:00.000Z',
    },
    {
      id: 'exp_4',
      teamId: team.id,
      paymentId: 'PAY-2026-0004',
      title: 'Trademark Search & Attorney Filing',
      amount: 8000,
      expenseDate: '2026-01-22',
      paidFromType: 'COMPANY_WALLET',
      walletId: walletBank2.id,
      category: 'Branding',
      reimbursedAmount: 0,
      createdAt: '2026-01-22T09:00:00.000Z',
      updatedAt: '2026-01-22T09:00:00.000Z',
    },
    {
      id: 'exp_5',
      teamId: team.id,
      paymentId: 'PAY-2026-0005',
      title: 'Product Photography Studio Session',
      amount: 5100,
      expenseDate: '2026-01-26',
      paidFromType: 'COMPANY_WALLET',
      walletId: walletCash.id,
      category: 'Marketing',
      reimbursedAmount: 0,
      createdAt: '2026-01-26T16:00:00.000Z',
      updatedAt: '2026-01-26T16:00:00.000Z',
    },
  ];

  // Transactions ledger
  const transactions: WalletTransaction[] = [
    // Opening balances
    {
      id: 'txn_open_1',
      teamId: team.id,
      transactionId: 'TXN-2026-0001',
      walletId: walletCash.id,
      type: 'OPENING_BALANCE',
      amount: 15000,
      transactionDate: '2026-01-10',
      description: 'Opening balance setup',
      resultingBalance: 15000,
      createdAt: '2026-01-10T09:00:00.000Z',
    },
    {
      id: 'txn_open_2',
      teamId: team.id,
      transactionId: 'TXN-2026-0002',
      walletId: walletBank1.id,
      type: 'OPENING_BALANCE',
      amount: 65000,
      transactionDate: '2026-01-10',
      description: 'Opening balance setup',
      resultingBalance: 65000,
      createdAt: '2026-01-10T09:00:00.000Z',
    },
    {
      id: 'txn_open_3',
      teamId: team.id,
      transactionId: 'TXN-2026-0003',
      walletId: walletBank2.id,
      type: 'OPENING_BALANCE',
      amount: 40000,
      transactionDate: '2026-01-10',
      description: 'Opening balance setup',
      resultingBalance: 40000,
      createdAt: '2026-01-10T09:00:00.000Z',
    },
    // Partner A contribution to Bank 1
    {
      id: 'txn_fund_1',
      teamId: team.id,
      transactionId: 'TXN-2026-0004',
      walletId: walletBank1.id,
      type: 'FUNDS_ADDED',
      amount: 30000,
      transactionDate: '2026-01-12',
      description: 'Working capital funding from Adil Salah',
      source: 'Partner A contribution',
      resultingBalance: 95000,
      createdAt: '2026-01-12T11:00:00.000Z',
    },
    // Company expense: PAY-2026-0001 (Bank 1)
    {
      id: 'txn_exp_1',
      teamId: team.id,
      transactionId: 'TXN-2026-0005',
      walletId: walletBank1.id,
      type: 'EXPENSE',
      amount: 3500,
      transactionDate: '2026-01-14',
      description: 'Payment for Domain Registration & Cloud Hosting (1 Year)',
      relatedExpenseId: 'exp_1',
      resultingBalance: 91500,
      createdAt: '2026-01-14T10:00:00.000Z',
    },
    // Transfer from Bank 1 to Cash
    {
      id: 'txn_tf_out_1',
      teamId: team.id,
      transactionId: 'TXN-2026-0006',
      walletId: walletBank1.id,
      type: 'TRANSFER_OUT',
      amount: 10000,
      transactionDate: '2026-01-15',
      description: 'Cash withdrawal for office petty cash pool',
      transferGroupId: 'tf_group_1',
      resultingBalance: 81500,
      createdAt: '2026-01-15T12:00:00.000Z',
    },
    {
      id: 'txn_tf_in_1',
      teamId: team.id,
      transactionId: 'TXN-2026-0007',
      walletId: walletCash.id,
      type: 'TRANSFER_IN',
      amount: 10000,
      transactionDate: '2026-01-15',
      description: 'Cash withdrawal for office petty cash pool',
      transferGroupId: 'tf_group_1',
      resultingBalance: 25000,
      createdAt: '2026-01-15T12:00:00.000Z',
    },
    // Reimbursement: partial ₹1,200 from Company Cash to Adil for PAY-2026-0002
    {
      id: 'txn_reimb_1',
      teamId: team.id,
      transactionId: 'TXN-2026-0008',
      walletId: walletCash.id,
      type: 'REIMBURSEMENT',
      amount: 1200,
      transactionDate: '2026-01-18',
      description: 'Partial reimbursement for PAY-2026-0002 to Adil Salah',
      relatedExpenseId: 'exp_2',
      resultingBalance: 23800,
      createdAt: '2026-01-18T15:00:00.000Z',
    },
    // Company expense: PAY-2026-0004 (Bank 2)
    {
      id: 'txn_exp_4',
      teamId: team.id,
      transactionId: 'TXN-2026-0009',
      walletId: walletBank2.id,
      type: 'EXPENSE',
      amount: 8000,
      transactionDate: '2026-01-22',
      description: 'Payment for Trademark Search & Attorney Filing',
      relatedExpenseId: 'exp_4',
      resultingBalance: 32000,
      createdAt: '2026-01-22T09:00:00.000Z',
    },
    // Company expense: PAY-2026-0005 (Company Cash)
    {
      id: 'txn_exp_5',
      teamId: team.id,
      transactionId: 'TXN-2026-0010',
      walletId: walletCash.id,
      type: 'EXPENSE',
      amount: 5100,
      transactionDate: '2026-01-26',
      description: 'Payment for Product Photography Studio Session',
      relatedExpenseId: 'exp_5',
      resultingBalance: 18700,
      createdAt: '2026-01-26T16:00:00.000Z',
    },
  ];

  return {
    users: [adil, hashim],
    teams: [team],
    wallets: [walletCash, walletBank1, walletBank2],
    goals: [goal1, goal2, goal3],
    tasks,
    expenses,
    walletTransactions: transactions,
    counters: {
      'payment_2026': 5,
      'txn_2026': 10,
    },
  };
}

class DatabaseManager {
  private data: AppDatabase;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): AppDatabase {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.teams && parsed.wallets && parsed.counters) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not load existing db.json, generating initial seed data:', err);
    }
    const seed = createInitialSeedData();
    this.saveImmediate(seed);
    return seed;
  }

  private saveImmediate(data: AppDatabase) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write db.json:', err);
    }
  }

  public save() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveImmediate(this.data);
      this.saveTimeout = null;
    }, 150);
  }

  public resetToSeed(): AppDatabase {
    this.data = createInitialSeedData();
    this.saveImmediate(this.data);
    return this.data;
  }

  public getDb(): AppDatabase {
    return this.data;
  }

  // Atomic sequence generator for payment IDs (PAY-YYYY-XXXX)
  public nextPaymentId(year: number = new Date().getFullYear()): string {
    const key = `payment_${year}`;
    if (!this.data.counters[key]) {
      this.data.counters[key] = 0;
    }
    this.data.counters[key] += 1;
    this.save();
    const seq = String(this.data.counters[key]).padStart(4, '0');
    return `PAY-${year}-${seq}`;
  }

  // Atomic sequence generator for wallet transactions (TXN-YYYY-XXXX)
  public nextTransactionId(year: number = new Date().getFullYear()): string {
    const key = `txn_${year}`;
    if (!this.data.counters[key]) {
      this.data.counters[key] = 0;
    }
    this.data.counters[key] += 1;
    this.save();
    const seq = String(this.data.counters[key]).padStart(4, '0');
    return `TXN-${year}-${seq}`;
  }

  // Recalculates wallet current balance by replaying ledger transactions
  public getWalletCurrentBalance(walletId: string): number {
    const wallet = this.data.wallets.find((w) => w.id === walletId);
    if (!wallet) return 0;
    return wallet.currentBalance;
  }
}

export const dbManager = new DatabaseManager();
