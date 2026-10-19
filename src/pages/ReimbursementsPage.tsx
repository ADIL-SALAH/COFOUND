import React, { useEffect, useState } from 'react';
import api from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  PartnerReimbursementSummary,
  CompanyWallet,
  SettlementHistoryItem,
} from '../types/index.ts';
import { Modal } from '../components/Modal.tsx';
import {
  HandCoins,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wallet,
  ArrowRight,
  History,
} from 'lucide-react';

interface ReimbursementsPageProps {
  initialPartnerId?: string;
}

export const ReimbursementsPage: React.FC<ReimbursementsPageProps> = ({
  initialPartnerId,
}) => {
  const { currentWorkspace } = useAuth();
  const [summaries, setSummaries] = useState<PartnerReimbursementSummary[]>([]);
  const [wallets, setWallets] = useState<CompanyWallet[]>([]);
  const [history, setHistory] = useState<SettlementHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Settlement Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(Boolean(initialPartnerId));
  const [selectedPartner, setSelectedPartner] = useState<PartnerReimbursementSummary | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleNotes, setSettleNotes] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!currentWorkspace) return;
    try {
      const [sumRes, walRes, histRes] = await Promise.all([
        api.get(`/workspaces/${currentWorkspace.id}/reimbursements`),
        api.get(`/workspaces/${currentWorkspace.id}/wallets`),
        api.get(`/workspaces/${currentWorkspace.id}/reimbursements/history`),
      ]);

      const summaryList = Array.isArray(sumRes.data) ? sumRes.data : [];
      const activeWallets = Array.isArray(walRes.data)
        ? walRes.data.filter((w: CompanyWallet) => w.status === 'ACTIVE')
        : [];
      setSummaries(summaryList);
      setWallets(activeWallets);
      setHistory(Array.isArray(histRes.data) ? histRes.data : []);

      if (activeWallets.length > 0 && !selectedWalletId) {
        setSelectedWalletId(activeWallets[0].id);
      }

      if (initialPartnerId) {
        const found = summaryList.find(
          (p: PartnerReimbursementSummary) => p.partnerId === initialPartnerId
        );
        if (found) {
          openSettleForPartner(found);
        }
      }
    } catch (err) {
      console.error('Failed to load reimbursements data:', err);
      setSummaries([]);
      setWallets([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentWorkspace]);

  const openSettleForPartner = (partner: PartnerReimbursementSummary) => {
    setSelectedPartner(partner);
    setSettleAmount(partner.outstandingReimbursement.toString());
    setSettleError(null);
    setSettleNotes(`Settlement for ${partner.partnerName}`);
    setSettleModalOpen(true);
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !selectedPartner) return;
    setSettleError(null);
    setSettleLoading(true);

    try {
      const numericAmount = parseFloat(settleAmount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error('Settlement amount must be greater than zero.');
      }

      if (numericAmount > selectedPartner.outstandingReimbursement) {
        throw new Error(
          `Amount cannot exceed outstanding liability of ₹${selectedPartner.outstandingReimbursement.toFixed(
            2
          )}.`
        );
      }

      const wallet = wallets.find((w) => w.id === selectedWalletId);
      if (wallet && numericAmount > wallet.currentBalance) {
        throw new Error(
          `Insufficient funds in ${wallet.name} (Available: ₹${wallet.currentBalance.toFixed(2)}).`
        );
      }

      await api.post(`/workspaces/${currentWorkspace.id}/reimbursements/settle`, {
        partnerId: selectedPartner.partnerId,
        walletId: selectedWalletId,
        amount: numericAmount,
        date: settleDate,
        notes: settleNotes.trim(),
      });

      setSettleModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setSettleError(err.response?.data?.error || err.message || 'Settlement failed.');
    } finally {
      setSettleLoading(false);
    }
  };

  const selectedWalletObj = wallets.find((w) => w.id === selectedWalletId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
          Partner Reimbursements & Liabilities
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Automatic liability tracking for personally paid business expenses (negative balance convention)
        </p>
      </div>

      {/* Partner Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {summaries.map((partner) => {
          const hasOwed = partner.outstandingReimbursement > 0;
          return (
            <div
              key={partner.partnerId}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{partner.partnerName}</h2>
                    <span className="text-xs text-slate-400 capitalize">{partner.role}</span>
                  </div>
                  <div
                    className={`p-2.5 rounded-xl ${
                      hasOwed ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <HandCoins className="w-5 h-5" />
                  </div>
                </div>

                {/* Displayed Balance Banner */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 mb-4">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Company Reimbursement Balance
                  </div>
                  <div
                    className={`text-2xl font-bold font-mono tabular-nums tracking-tight mt-1 ${
                      hasOwed ? 'text-amber-700' : 'text-slate-800'
                    }`}
                  >
                    {hasOwed
                      ? `-₹${partner.outstandingReimbursement.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}`
                      : '₹0.00'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {hasOwed
                      ? `The company owes ${partner.partnerName} ₹${partner.outstandingReimbursement.toFixed(2)}`
                      : 'All personal business expenses have been settled.'}
                  </p>
                </div>

                {/* Statistics Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total Personally Paid Expenses:</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      ₹{partner.totalPersonalExpenses.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total Amount Settled by Company:</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      ₹{partner.totalSettled.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Unsettled Expenses Count:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {partner.unpaidExpensesCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {hasOwed ? 'Settlement eligible' : 'Fully balanced'}
                </span>
                {hasOwed ? (
                  <button
                    onClick={() => openSettleForPartner(partner)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
                  >
                    <span>Settle Partner</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>No Debt</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settlement History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
          <History className="w-4 h-4 text-slate-600" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Reimbursement Settlement History
          </h2>
        </div>

        <div className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No settlements completed yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Settlement Ref</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Partner</th>
                  <th className="py-3 px-4 font-semibold">Company Wallet Paid From</th>
                  <th className="py-3 px-4 font-semibold">Notes</th>
                  <th className="py-3 px-4 font-semibold text-right">Settled Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {item.settlementId}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {item.partnerName}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {item.walletName}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {item.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Settle Modal */}
      {selectedPartner && (
        <Modal
          isOpen={settleModalOpen}
          onClose={() => setSettleModalOpen(false)}
          title={`Settle Reimbursement: ${selectedPartner.partnerName}`}
          subtitle={`Current Outstanding Liability: ₹${selectedPartner.outstandingReimbursement.toFixed(2)}`}
          maxWidth="md"
        >
          {settleError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {settleError}
            </div>
          )}

          <form onSubmit={handleSettle} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paying Company Wallet *
              </label>
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-medium"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} (Available: ₹{w.currentBalance.toFixed(2)})
                  </option>
                ))}
              </select>
              {selectedWalletObj && (
                <div className="mt-1 text-[11px] text-slate-500">
                  Wallet Liquidity: <span className="font-mono font-bold text-slate-800">₹{selectedWalletObj.currentBalance.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Settlement Amount (₹ INR) *
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSettleAmount('500')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] text-slate-700 font-medium"
                  >
                    ₹500
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleAmount('1000')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] text-slate-700 font-medium"
                  >
                    ₹1,000
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSettleAmount(selectedPartner.outstandingReimbursement.toString())
                    }
                    className="px-2 py-0.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded text-[10px] font-semibold"
                  >
                    Full Amount
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedPartner.outstandingReimbursement}
                required
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Supports partial or full settlement. Capped at outstanding debt.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Settlement Date *
              </label>
              <input
                type="date"
                required
                value={settleDate}
                onChange={(e) => setSettleDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
                placeholder="e.g. Bank transfer to partner personal account"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={settleLoading}
                className="px-4 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
              >
                {settleLoading ? 'Processing...' : 'Confirm Settlement'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
