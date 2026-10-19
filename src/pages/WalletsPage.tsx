import React, { useEffect, useState } from 'react';
import api from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { CompanyWallet, WalletTransaction } from '../types/index.ts';
import { Modal } from '../components/Modal.tsx';
import {
  Wallet,
  Plus,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Building2,
  Banknote,
  Edit2,
  Calendar,
} from 'lucide-react';

interface WalletsPageProps {
  openTransferOnMount?: boolean;
}

export const WalletsPage: React.FC<WalletsPageProps> = ({
  openTransferOnMount = false,
}) => {
  const { currentWorkspace } = useAuth();
  const [wallets, setWallets] = useState<CompanyWallet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for ledger
  const [selectedWalletFilter, setSelectedWalletFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  // Add Funds Modal
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [depositWalletId, setDepositWalletId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSource, setDepositSource] = useState('Partner A contribution');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositNotes, setDepositNotes] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Transfer Modal
  const [transferOpen, setTransferOpen] = useState(openTransferOnMount);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Add Wallet Modal
  const [createWalletOpen, setCreateWalletOpen] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<'CASH' | 'BANK'>('BANK');
  const [walletOpening, setWalletOpening] = useState('0');
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!currentWorkspace) return;
    try {
      const params: any = {};
      if (selectedWalletFilter !== 'ALL') params.walletId = selectedWalletFilter;
      if (selectedTypeFilter !== 'ALL') params.type = selectedTypeFilter;

      const [walRes, txnRes] = await Promise.all([
        api.get(`/workspaces/${currentWorkspace.id}/wallets`),
        api.get(`/workspaces/${currentWorkspace.id}/transactions`, { params }),
      ]);

      const walletList = Array.isArray(walRes.data) ? walRes.data : [];
      setWallets(walletList);
      setTransactions(Array.isArray(txnRes.data) ? txnRes.data : []);

      if (!depositWalletId && walletList.length > 0) {
        setDepositWalletId(walletList[0].id);
      }
      if (!transferFrom && walletList.length > 0) {
        setTransferFrom(walletList[0].id);
      }
      if (!transferTo && walletList.length > 1) {
        setTransferTo(walletList[1].id);
      }
    } catch (err) {
      console.error('Failed to fetch wallets and transactions:', err);
      setWallets([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentWorkspace, selectedWalletFilter, selectedTypeFilter]);

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setDepositError(null);
    setDepositLoading(true);

    try {
      await api.post(`/workspaces/${currentWorkspace.id}/wallets/${depositWalletId}/funds`, {
        amount: depositAmount,
        date: depositDate,
        source: depositSource,
        description: depositNotes.trim(),
      });
      setAddFundsOpen(false);
      setDepositAmount('');
      setDepositNotes('');
      await fetchData();
    } catch (err: any) {
      setDepositError(err.response?.data?.error || 'Failed to add funds.');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setTransferError(null);
    setTransferLoading(true);

    try {
      await api.post(`/workspaces/${currentWorkspace.id}/wallets/transfer`, {
        fromWalletId: transferFrom,
        toWalletId: transferTo,
        amount: transferAmount,
        date: transferDate,
        notes: transferNotes.trim(),
      });
      setTransferOpen(false);
      setTransferAmount('');
      setTransferNotes('');
      await fetchData();
    } catch (err: any) {
      setTransferError(err.response?.data?.error || 'Transfer failed.');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setWalletError(null);
    setWalletLoading(true);

    try {
      await api.post(`/workspaces/${currentWorkspace.id}/wallets`, {
        name: walletName.trim(),
        type: walletType,
        openingBalance: walletOpening,
      });
      setCreateWalletOpen(false);
      setWalletName('');
      setWalletOpening('0');
      await fetchData();
    } catch (err: any) {
      setWalletError(err.response?.data?.error || 'Failed to create wallet.');
    } finally {
      setWalletLoading(false);
    }
  };

  const totalFunds = wallets
    .filter((w) => w.status === 'ACTIVE')
    .reduce((acc, curr) => acc + curr.currentBalance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
            Company Wallets & Funds
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Liquid accounts, inter-wallet transfers, and verified transaction journals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTransferError(null);
              setTransferOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Transfer Funds</span>
          </button>
          <button
            onClick={() => {
              setDepositError(null);
              setAddFundsOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Funds</span>
          </button>
        </div>
      </div>

      {/* Total Funds Banner */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Available Company Funds
          </span>
          <div className="text-3xl font-bold font-mono tabular-nums text-slate-900 tracking-tight mt-1">
            ₹{totalFunds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritatively derived from opening balance + ledger journal entries
          </p>
        </div>

        {currentWorkspace?.isOwner && (
          <button
            onClick={() => {
              setWalletError(null);
              setCreateWalletOpen(true);
            }}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors self-start sm:self-auto"
          >
            + Add Another Wallet
          </button>
        )}
      </div>

      {/* Individual Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-900">{wallet.name}</span>
                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                  {wallet.type === 'CASH' ? (
                    <Banknote className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Building2 className="w-4 h-4 text-slate-600" />
                  )}
                </div>
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                ₹{wallet.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Opening Balance: ₹{wallet.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-emerald-800">
                {wallet.type === 'CASH' ? 'Cash in Hand' : 'Bank Account'}
              </span>
              <button
                onClick={() => {
                  setDepositWalletId(wallet.id);
                  setAddFundsOpen(true);
                }}
                className="text-emerald-700 hover:text-emerald-800 font-semibold"
              >
                + Deposit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Ledger Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Ledger Header & Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Transaction History Journal
            </h2>
            <p className="text-[11px] text-slate-500">
              Immutable debit and credit entries with dynamic TXN references
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedWalletFilter}
              onChange={(e) => setSelectedWalletFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Wallets</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Event Types</option>
              <option value="OPENING_BALANCE">Opening Balance</option>
              <option value="FUNDS_ADDED">Funds Added</option>
              <option value="COMPANY_PAID_EXPENSE">Company Expense</option>
              <option value="REIMBURSEMENT_SETTLEMENT">Reimbursement</option>
              <option value="TRANSFER_IN">Transfer In</option>
              <option value="TRANSFER_OUT">Transfer Out</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No transactions recorded for this filter.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Ref</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Wallet</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount (₹)</th>
                  <th className="py-3 px-4 font-semibold text-right">Resulting Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const isIncoming = ['OPENING_BALANCE', 'FUNDS_ADDED', 'TRANSFER_IN'].includes(t.type);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {t.transactionId}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {t.walletName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="capitalize">
                          {t.type.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {t.description || t.source || '—'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                          isIncoming ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {isIncoming ? '+' : '-'}₹
                        {t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-800 tabular-nums whitespace-nowrap">
                        ₹{t.resultingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Funds Modal */}
      <Modal
        isOpen={addFundsOpen}
        onClose={() => setAddFundsOpen(false)}
        title="Add Funds to Company Wallet"
        subtitle="Record partner capital injection or business revenue"
        maxWidth="sm"
      >
        {depositError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
            {depositError}
          </div>
        )}
        <form onSubmit={handleAddFunds} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Destination Wallet *
            </label>
            <select
              value={depositWalletId}
              onChange={(e) => setDepositWalletId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Current: ₹{w.currentBalance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount (₹ INR) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="10000.00"
              className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Funding Source *
            </label>
            <select
              value={depositSource}
              onChange={(e) => setDepositSource(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            >
              <option value="Partner A contribution">Partner A contribution</option>
              <option value="Partner B contribution">Partner B contribution</option>
              <option value="Business income">Business income</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={depositNotes}
              onChange={(e) => setDepositNotes(e.target.value)}
              placeholder="e.g. Initial seed capital"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddFundsOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={depositLoading}
              className="px-4 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
            >
              {depositLoading ? 'Saving...' : 'Add Funds'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer Funds Between Wallets"
        subtitle="Moves money between accounts without affecting total company funds"
        maxWidth="sm"
      >
        {transferError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
            {transferError}
          </div>
        )}
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              From Wallet (Source) *
            </label>
            <select
              value={transferFrom}
              onChange={(e) => setTransferFrom(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Available: ₹{w.currentBalance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              To Wallet (Destination) *
            </label>
            <select
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Available: ₹{w.currentBalance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transfer Amount (₹ INR) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="5000.00"
              className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              placeholder="e.g. Cash withdrawal from Bank 1"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setTransferOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={transferLoading}
              className="px-4 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
            >
              {transferLoading ? 'Transferring...' : 'Execute Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Wallet Modal */}
      <Modal
        isOpen={createWalletOpen}
        onClose={() => setCreateWalletOpen(false)}
        title="Add Company Wallet"
        maxWidth="sm"
      >
        {walletError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
            {walletError}
          </div>
        )}
        <form onSubmit={handleCreateWallet} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Wallet Name *
            </label>
            <input
              type="text"
              required
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              placeholder="e.g. Current Account HDFC, Petty Cash"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Wallet Type *
            </label>
            <select
              value={walletType}
              onChange={(e) => setWalletType(e.target.value as 'CASH' | 'BANK')}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            >
              <option value="BANK">Bank Account</option>
              <option value="CASH">Physical Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Opening Balance (₹ INR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={walletOpening}
              onChange={(e) => setWalletOpening(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateWalletOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={walletLoading}
              className="px-4 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
            >
              {walletLoading ? 'Creating...' : 'Create Wallet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
