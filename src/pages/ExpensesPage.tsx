import React, { useEffect, useState } from 'react';
import api from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Expense, CompanyWallet, WorkspaceMember } from '../types/index.ts';
import { Modal } from '../components/Modal.tsx';
import { ReceiptViewerModal } from '../components/ReceiptViewerModal.tsx';
import {
  Plus,
  Receipt,
  FileText,
  Search,
  Filter,
  RefreshCw,
  HandCoins,
  UploadCloud,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

const CATEGORIES = [
  'Branding',
  'Product Purchase',
  'Sourcing',
  'Website and Software',
  'Marketing',
  'Packaging',
  'Transport',
  'Operations',
  'Travel',
  'Equipment',
  'Office expenses',
  'Other',
];

interface ExpensesPageProps {
  onOpenSettleModal: (partnerId?: string) => void;
  openCreateOnMount?: boolean;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  onOpenSettleModal,
  openCreateOnMount = false,
}) => {
  const { currentWorkspace, user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [wallets, setWallets] = useState<CompanyWallet[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [partnerFilter, setPartnerFilter] = useState('ALL');
  const [walletFilter, setWalletFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Add Expense Modal
  const [createModalOpen, setCreateModalOpen] = useState(openCreateOnMount);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  // 'personal' or 'company'
  const [paymentSourceType, setPaymentSourceType] = useState<'personal' | 'company'>('personal');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Receipt Modal
  const [receiptModalExpense, setReceiptModalExpense] = useState<Expense | null>(null);

  const fetchData = async () => {
    if (!currentWorkspace) return;
    try {
      const params: any = {};
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (sourceFilter !== 'ALL') params.paymentSourceType = sourceFilter;
      if (partnerFilter !== 'ALL') params.partnerId = partnerFilter;
      if (walletFilter !== 'ALL') params.walletId = walletFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [expRes, walRes, memRes] = await Promise.all([
        api.get(`/workspaces/${currentWorkspace.id}/expenses`, { params }),
        api.get(`/workspaces/${currentWorkspace.id}/wallets`),
        api.get(`/workspaces/${currentWorkspace.id}/members`),
      ]);

      setExpenses(Array.isArray(expRes.data) ? expRes.data : []);
      const activeWallets = Array.isArray(walRes.data)
        ? walRes.data.filter((w: CompanyWallet) => w.status === 'ACTIVE')
        : [];
      setWallets(activeWallets);
      setMembers(Array.isArray(memRes.data) ? memRes.data : []);

      if (!selectedPartnerId && user) {
        setSelectedPartnerId(user.id);
      }
      if (!selectedWalletId && activeWallets.length > 0) {
        setSelectedWalletId(activeWallets[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      setExpenses([]);
      setWallets([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    currentWorkspace,
    categoryFilter,
    sourceFilter,
    partnerFilter,
    walletFilter,
    searchQuery,
    startDate,
    endDate,
  ]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('amount', amount);
      formData.append('expenseDate', expenseDate);
      formData.append('category', category);
      formData.append('paymentSourceType', paymentSourceType);

      if (paymentSourceType === 'personal') {
        formData.append('payingPartnerId', selectedPartnerId || user?.id || '');
      } else {
        formData.append('companyWalletId', selectedWalletId);
      }

      if (description.trim()) {
        formData.append('description', description.trim());
      }

      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      await api.post(`/workspaces/${currentWorkspace.id}/expenses`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCreateModalOpen(false);
      // Reset form
      setTitle('');
      setAmount('');
      setDescription('');
      setReceiptFile(null);
      await fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  // Metric totals
  const totalBusinessExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalCompanyPaid = expenses
    .filter((e) => e.paymentSourceType === 'company')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalPersonalPaid = expenses
    .filter((e) => e.paymentSourceType === 'personal')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
            Expenses & Bills
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Atomic payment records with receipt storage and reimbursement tracking
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setCreateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Business Expenses
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            ₹{totalBusinessExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {expenses.length} recorded payments
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Paid from Company Wallets
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            ₹{totalCompanyPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Direct account debits
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Paid Personally by Partners
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-1">
            ₹{totalPersonalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Reimbursable business costs
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, PAY ID (e.g. PAY-2026-0001), or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Payment Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Sources (Personal & Company)</option>
            <option value="personal">Partner Personal Only</option>
            <option value="company">Company Wallets Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Sub-row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>
          {(startDate || endDate || categoryFilter !== 'ALL' || sourceFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setCategoryFilter('ALL');
                setSourceFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-emerald-700 hover:underline font-medium ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Loading expenses...</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No Expenses Recorded</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Record business expenses paid personally or from company cash/bank accounts.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-xs"
            >
              Record First Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Payment ID</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Expense Title</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Paid From</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount (₹)</th>
                  <th className="py-3 px-4 font-semibold text-center">Receipt</th>
                  <th className="py-3 px-4 font-semibold text-right">Reimbursement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {exp.paymentId}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(exp.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{exp.title}</div>
                      {exp.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {exp.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {exp.category}
                    </td>
                    <td className="py-3 px-4">
                      {exp.paymentSourceType === 'personal' ? (
                        <span className="font-medium text-amber-800">
                          {exp.payingPartnerName || 'Partner'} (Personal)
                        </span>
                      ) : (
                        <span className="font-medium text-slate-800">
                          {exp.companyWalletName || 'Company Wallet'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {exp.hasReceipt ? (
                        <button
                          type="button"
                          onClick={() => setReceiptModalExpense(exp)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-medium text-[11px] transition-colors"
                          title="View attached bill"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-slate-300">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {exp.paymentSourceType === 'personal' ? (
                        exp.outstandingReimbursement > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[11px] font-mono text-amber-700 font-semibold tabular-nums">
                              Owed: ₹{exp.outstandingReimbursement.toFixed(2)}
                            </span>
                            <button
                              onClick={() => onOpenSettleModal(exp.payingPartnerId)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded text-[11px] text-slate-700 font-medium transition-colors"
                            >
                              Settle
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Fully Settled</span>
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400">Direct debit</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Record Business Expense"
        subtitle="Generates unique atomic PAY-YYYY-XXXX reference"
        maxWidth="md"
      >
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expense Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Logo design, Packaging materials, Domain purchase"
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (₹ INR) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2000.00"
                className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Paid From Source Selector */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-slate-900">
              Who paid for this expense? *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentSourceType('personal')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                  paymentSourceType === 'personal'
                    ? 'bg-white border-emerald-600 text-emerald-900 font-semibold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                Partner Personal Funds
              </button>
              <button
                type="button"
                onClick={() => setPaymentSourceType('company')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                  paymentSourceType === 'company'
                    ? 'bg-white border-emerald-600 text-emerald-900 font-semibold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                Company Wallet
              </button>
            </div>

            {paymentSourceType === 'personal' ? (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Paying Partner (defaults to logged-in user)
                </label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Creates an outstanding reimbursement liability owed to this partner.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Source Company Wallet
                </label>
                <select
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Available: ₹{w.currentBalance.toFixed(2)})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Direct debit from company funds. Blocked if balance is insufficient.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Notes (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Paid via UPI, invoice ref #104"
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Receipt File Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Attach Bill / Receipt (optional &bull; JPG, PNG, PDF up to 5MB)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setReceiptFile(e.target.files[0]);
                  }
                }}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
            </div>
            {receiptFile && (
              <div className="mt-1 text-[11px] text-emerald-700 font-medium">
                Selected: {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receipt Viewer Modal */}
      {receiptModalExpense && (
        <ReceiptViewerModal
          isOpen={Boolean(receiptModalExpense)}
          onClose={() => setReceiptModalExpense(null)}
          expenseId={receiptModalExpense.id}
          paymentId={receiptModalExpense.paymentId}
          title={receiptModalExpense.title}
          receiptName={receiptModalExpense.receiptName}
        />
      )}
    </div>
  );
};
