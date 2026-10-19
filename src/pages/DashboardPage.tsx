import React, { useEffect, useState } from 'react';
import api from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { DashboardData } from '../types/index.ts';
import {
  Wallet,
  Receipt,
  CheckSquare,
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
  RefreshCw,
  Plus,
  ArrowRightLeft,
  ChevronRight,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: any) => void;
  onOpenRecordExpense: () => void;
  onOpenTransfer: () => void;
  onOpenSettleModal: (partnerId?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenRecordExpense,
  onOpenTransfer,
  onOpenSettleModal,
}) => {
  const { currentWorkspace } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    if (!currentWorkspace) return;
    try {
      const res = await api.get(`/workspaces/${currentWorkspace.id}/dashboard`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [currentWorkspace]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Loading financial overview...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        No dashboard data available.
      </div>
    );
  }

  const { funds, expenses, tasks, recentTransactions, recentExpenses } = data;
  const safeRecentExpenses = Array.isArray(recentExpenses) ? recentExpenses : [];
  const safeRecentTransactions = Array.isArray(recentTransactions) ? recentTransactions : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
            Workspace Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time liquid funds, partner expenses, and daily tasks
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            title="Refresh figures"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onOpenTransfer}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Transfer Funds</span>
          </button>
          <button
            onClick={onOpenRecordExpense}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* 3 Core Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Company Funds */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Total Company Funds</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            ₹{funds.totalCompanyFunds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            {funds.walletBalances.map((w) => (
              <div key={w.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate">{w.name}</span>
                <span className="font-mono tabular-nums font-medium text-slate-800">
                  ₹{w.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Business Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Business Expenses</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
            ₹{expenses.totalBusinessExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Company Wallets Paid</span>
              <span className="font-mono tabular-nums font-medium text-slate-800">
                ₹{expenses.totalCompanyPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {(expenses?.partnerSpending || []).map((p) => (
              <div key={p.partnerId} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate">{p.partnerName} (Personal)</span>
                <span className="font-mono tabular-nums font-medium text-slate-800">
                  ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Tasks & Goals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Tasks & Deliverables</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {tasks.completedTasks}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              of {tasks.totalTasks} completed
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-xs mb-1.5 text-slate-600">
              <span>Goal Progress</span>
              <span className="font-mono">
                {tasks.totalTasks > 0
                  ? Math.round((tasks.completedTasks / tasks.totalTasks) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    tasks.totalTasks > 0
                      ? Math.round((tasks.completedTasks / tasks.totalTasks) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Active Goals: {tasks.totalGoals}</span>
              <span>Pending Tasks: {tasks.pendingTasks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Reimbursements Strip */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Partner Reimbursement Liabilities
            </h2>
            <p className="text-[11px] text-slate-500">
              Personal expenses owed by company (sign convention: negative indicates company debt)
            </p>
          </div>
          <div className="text-xs text-slate-600 font-medium">
            Total Outstanding:{' '}
            <span className="font-mono tabular-nums font-bold text-slate-900">
              ₹{expenses.totalOutstandingReimbursement.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {(expenses?.partnerReimbursements || []).map((p) => {
            const hasOwed = p.outstandingReimbursement > 0;
            return (
              <div
                key={p.partnerId}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{p.partnerName}</span>
                    <span className="text-[11px] text-slate-500 capitalize">{p.role}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mb-2">
                    Paid personally: ₹{p.totalPersonalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })} &bull; Settled: ₹{p.totalSettled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400">
                      Displayed Balance
                    </div>
                    <div
                      className={`text-base font-bold font-mono tabular-nums ${
                        hasOwed ? 'text-amber-700' : 'text-slate-700'
                      }`}
                    >
                      {hasOwed
                        ? `-₹${p.outstandingReimbursement.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}`
                        : '₹0.00'}
                    </div>
                  </div>

                  {hasOwed && (
                    <button
                      onClick={() => onOpenSettleModal(p.partnerId)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
                    >
                      Settle
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Column Lists: Recent Expenses & Recent Wallet Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Expenses */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">Recent Business Expenses</h3>
            <button
              onClick={() => onNavigate('expenses')}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {safeRecentExpenses.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No recorded expenses yet.
              </div>
            ) : (
              safeRecentExpenses.map((e) => (
                <div key={e.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/60 transition-colors">
                  <div>
                    <div className="font-semibold text-slate-900">{e.title}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-slate-400">{e.paymentId}</span>
                      <span>&bull;</span>
                      <span>{e.category}</span>
                      <span>&bull;</span>
                      <span className="capitalize">{e.payerName || e.paymentSourceType}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900 tabular-nums">
                      ₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(e.expenseDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Recent Wallet Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900">Recent Wallet Transactions</h3>
            <button
              onClick={() => onNavigate('wallets')}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {safeRecentTransactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No transactions recorded yet.
              </div>
            ) : (
              safeRecentTransactions.map((t) => {
                const isIncoming = ['OPENING_BALANCE', 'FUNDS_ADDED', 'TRANSFER_IN'].includes(t.type);
                return (
                  <div key={t.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          isIncoming ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isIncoming ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 truncate max-w-[180px] sm:max-w-xs">
                          {t.description || t.type}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-slate-400">{t.transactionId}</span>
                          <span>&bull;</span>
                          <span>{t.walletName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-mono font-bold tabular-nums ${
                          isIncoming ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {isIncoming ? '+' : '-'}₹
                        {t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Bal: ₹{t.resultingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
