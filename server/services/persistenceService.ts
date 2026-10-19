import fs from 'fs';
import path from 'path';
import { User } from '../models/User.ts';
import { Workspace } from '../models/Workspace.ts';
import { WorkspaceMembership } from '../models/WorkspaceMembership.ts';
import { WorkspaceInvitation } from '../models/WorkspaceInvitation.ts';
import { CompanyWallet } from '../models/CompanyWallet.ts';
import { Goal } from '../models/Goal.ts';
import { Task } from '../models/Task.ts';
import { Expense } from '../models/Expense.ts';
import { WalletTransaction } from '../models/WalletTransaction.ts';
import { ReimbursementSettlement } from '../models/ReimbursementSettlement.ts';
import { SequenceCounter } from '../models/SequenceCounter.ts';

const BACKUP_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_FILE = path.join(BACKUP_DIR, 'db_backup.json');

export async function saveDatabaseSnapshot(): Promise<void> {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const [
      users,
      workspaces,
      memberships,
      invitations,
      wallets,
      goals,
      tasks,
      expenses,
      transactions,
      settlements,
      sequences,
    ] = await Promise.all([
      User.find().lean(),
      Workspace.find().lean(),
      WorkspaceMembership.find().lean(),
      WorkspaceInvitation.find().lean(),
      CompanyWallet.find().lean(),
      Goal.find().lean(),
      Task.find().lean(),
      Expense.find().lean(),
      WalletTransaction.find().lean(),
      ReimbursementSettlement.find().lean(),
      SequenceCounter.find().lean(),
    ]);

    const snapshot = {
      version: 1,
      savedAt: new Date().toISOString(),
      data: {
        users,
        workspaces,
        memberships,
        invitations,
        wallets,
        goals,
        tasks,
        expenses,
        transactions,
        settlements,
        sequences,
      },
    };

    const tmpFile = `${BACKUP_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(snapshot, null, 2), 'utf-8');
    fs.renameSync(tmpFile, BACKUP_FILE);
  } catch (err) {
    console.warn('Warning: Could not save database snapshot:', err);
  }
}

let saveTimeout: NodeJS.Timeout | null = null;
export function triggerDebouncedBackup(delayMs = 1000): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveDatabaseSnapshot().catch(() => {});
  }, delayMs);
}

export async function restoreDatabaseSnapshot(): Promise<boolean> {
  if (!fs.existsSync(BACKUP_FILE)) {
    return false;
  }

  try {
    const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed || !parsed.data) {
      return false;
    }

    const {
      users = [],
      workspaces = [],
      memberships = [],
      invitations = [],
      wallets = [],
      goals = [],
      tasks = [],
      expenses = [],
      transactions = [],
      settlements = [],
      sequences = [],
    } = parsed.data;

    // Only restore if user count is currently 0
    const count = await User.countDocuments();
    if (count > 0) {
      return true;
    }

    console.log(`Restoring database from snapshot (${users.length} users, ${workspaces.length} workspaces)...`);

    if (users.length > 0) await User.insertMany(users);
    if (workspaces.length > 0) await Workspace.insertMany(workspaces);
    if (memberships.length > 0) await WorkspaceMembership.insertMany(memberships);
    if (invitations.length > 0) await WorkspaceInvitation.insertMany(invitations);
    if (wallets.length > 0) await CompanyWallet.insertMany(wallets);
    if (goals.length > 0) await Goal.insertMany(goals);
    if (tasks.length > 0) await Task.insertMany(tasks);
    if (expenses.length > 0) await Expense.insertMany(expenses);
    if (transactions.length > 0) await WalletTransaction.insertMany(transactions);
    if (settlements.length > 0) await ReimbursementSettlement.insertMany(settlements);
    if (sequences.length > 0) await SequenceCounter.insertMany(sequences);

    console.log('Database snapshot restored successfully.');
    return true;
  } catch (err) {
    console.error('Failed to restore database snapshot:', err);
    return false;
  }
}
