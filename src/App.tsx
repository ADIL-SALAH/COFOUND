import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { Modal } from './components/Modal.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { GoalsTasksPage } from './pages/GoalsTasksPage.tsx';
import { ExpensesPage } from './pages/ExpensesPage.tsx';
import { WalletsPage } from './pages/WalletsPage.tsx';
import { ReimbursementsPage } from './pages/ReimbursementsPage.tsx';
import { MembersPage } from './pages/MembersPage.tsx';
import { RefreshCw, Building2, Plus, ArrowRight } from 'lucide-react';

function AppContent() {
  const { user, currentWorkspace, loading, createWorkspace, joinWorkspace } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Global Action Modals triggered from navbar or dashboard
  const [createWsModalOpen, setCreateWsModalOpen] = useState(false);
  const [joinWsModalOpen, setJoinWsModalOpen] = useState(false);
  const [wsNameInput, setWsNameInput] = useState('');
  const [wsCodeInput, setWsCodeInput] = useState('');
  const [wsActionLoading, setWsActionLoading] = useState(false);
  const [wsActionError, setWsActionError] = useState<string | null>(null);

  // Shortcut triggers for expenses, transfers, reimbursements
  const [openExpenseShortcut, setOpenExpenseShortcut] = useState(false);
  const [openTransferShortcut, setOpenTransferShortcut] = useState(false);
  const [settlePartnerTarget, setSettlePartnerTarget] = useState<string | undefined>(undefined);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Starting CoFound workspace...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated: render Login / Register
  if (!user) {
    if (authView === 'register') {
      return <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthView('register')} />;
  }

  // Authenticated but no workspace: prompt creation or join
  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Welcome, {user.name}!</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            You are not in a company workspace yet. Create a company or enter an invitation code to collaborate with your partner.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setWsActionError(null);
                setCreateWsModalOpen(true);
              }}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Company Workspace</span>
            </button>
            <button
              onClick={() => {
                setWsActionError(null);
                setJoinWsModalOpen(true);
              }}
              className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              <span>Join with Partner's Invite Code</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Create Workspace Modal */}
        <Modal
          isOpen={createWsModalOpen}
          onClose={() => setCreateWsModalOpen(false)}
          title="Create Company Workspace"
          maxWidth="sm"
        >
          {wsActionError && (
            <div className="mb-3 p-2.5 bg-red-50 text-xs text-red-700 rounded-lg">
              {wsActionError}
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!wsNameInput.trim()) return;
              setWsActionLoading(true);
              setWsActionError(null);
              try {
                await createWorkspace(wsNameInput.trim());
                setCreateWsModalOpen(false);
                setWsNameInput('');
              } catch (err: any) {
                setWsActionError(err.response?.data?.error || 'Failed to create workspace.');
              } finally {
                setWsActionLoading(false);
              }
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Apex Ventures"
                value={wsNameInput}
                onChange={(e) => setWsNameInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateWsModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={wsActionLoading}
                className="px-4 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium disabled:opacity-50"
              >
                {wsActionLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Join Workspace Modal */}
        <Modal
          isOpen={joinWsModalOpen}
          onClose={() => setJoinWsModalOpen(false)}
          title="Join Partner Workspace"
          maxWidth="sm"
        >
          {wsActionError && (
            <div className="mb-3 p-2.5 bg-red-50 text-xs text-red-700 rounded-lg">
              {wsActionError}
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!wsCodeInput.trim()) return;
              setWsActionLoading(true);
              setWsActionError(null);
              try {
                await joinWorkspace(wsCodeInput.trim().toUpperCase());
                setJoinWsModalOpen(false);
                setWsCodeInput('');
              } catch (err: any) {
                setWsActionError(err.response?.data?.error || 'Invalid or expired invitation code.');
              } finally {
                setWsActionLoading(false);
              }
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                6-Character Invite Code *
              </label>
              <input
                type="text"
                required
                autoFocus
                maxLength={10}
                placeholder="e.g. APEX26"
                value={wsCodeInput}
                onChange={(e) => setWsCodeInput(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono uppercase tracking-wider border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setJoinWsModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={wsActionLoading}
                className="px-4 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium disabled:opacity-50"
              >
                {wsActionLoading ? 'Joining...' : 'Join Workspace'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // Main Authenticated Workspace Layout
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar
        onOpenCreateWorkspace={() => {
          setWsActionError(null);
          setCreateWsModalOpen(true);
        }}
        onOpenJoinWorkspace={() => {
          setWsActionError(null);
          setJoinWsModalOpen(true);
        }}
        onOpenManageWorkspace={() => {
          setActiveTab('members');
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenRecordExpense={() => setActiveTab('expenses')}
              onOpenTransfer={() => setActiveTab('wallets')}
              onOpenSettleModal={(partnerId) => {
                setSettlePartnerTarget(partnerId);
                setActiveTab('reimbursements');
              }}
            />
          )}

          {activeTab === 'tasks' && <GoalsTasksPage />}

          {activeTab === 'expenses' && (
            <ExpensesPage
              openCreateOnMount={openExpenseShortcut}
              onOpenSettleModal={(partnerId) => {
                setSettlePartnerTarget(partnerId);
                setActiveTab('reimbursements');
              }}
            />
          )}

          {activeTab === 'wallets' && (
            <WalletsPage openTransferOnMount={openTransferShortcut} />
          )}

          {activeTab === 'reimbursements' && (
            <ReimbursementsPage initialPartnerId={settlePartnerTarget} />
          )}

          {activeTab === 'members' && <MembersPage />}
        </main>
      </div>

      {/* Global Workspace Creation Modal */}
      <Modal
        isOpen={createWsModalOpen}
        onClose={() => setCreateWsModalOpen(false)}
        title="Create New Workspace"
        subtitle="Initialize a shared workspace with Cash & Bank accounts"
        maxWidth="sm"
      >
        {wsActionError && (
          <div className="mb-3 p-2.5 bg-red-50 text-xs text-red-700 rounded-lg">
            {wsActionError}
          </div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!wsNameInput.trim()) return;
            setWsActionLoading(true);
            setWsActionError(null);
            try {
              await createWorkspace(wsNameInput.trim());
              setCreateWsModalOpen(false);
              setWsNameInput('');
            } catch (err: any) {
              setWsActionError(err.response?.data?.error || 'Failed to create workspace.');
            } finally {
              setWsActionLoading(false);
            }
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company / Venture Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Apex Ventures"
              value={wsNameInput}
              onChange={(e) => setWsNameInput(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateWsModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 border rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={wsActionLoading}
              className="px-4 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium disabled:opacity-50"
            >
              {wsActionLoading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Global Workspace Join Modal */}
      <Modal
        isOpen={joinWsModalOpen}
        onClose={() => setJoinWsModalOpen(false)}
        title="Join Partner Workspace"
        subtitle="Enter the 6-character code from your co-founder"
        maxWidth="sm"
      >
        {wsActionError && (
          <div className="mb-3 p-2.5 bg-red-50 text-xs text-red-700 rounded-lg">
            {wsActionError}
          </div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!wsCodeInput.trim()) return;
            setWsActionLoading(true);
            setWsActionError(null);
            try {
              await joinWorkspace(wsCodeInput.trim().toUpperCase());
              setJoinWsModalOpen(false);
              setWsCodeInput('');
            } catch (err: any) {
              setWsActionError(err.response?.data?.error || 'Invalid or expired invitation code.');
            } finally {
              setWsActionLoading(false);
            }
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invitation Code *
            </label>
            <input
              type="text"
              required
              autoFocus
              maxLength={10}
              placeholder="e.g. APEX26"
              value={wsCodeInput}
              onChange={(e) => setWsCodeInput(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-xs font-mono uppercase tracking-wider border border-slate-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setJoinWsModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 border rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={wsActionLoading}
              className="px-4 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium disabled:opacity-50"
            >
              {wsActionLoading ? 'Joining...' : 'Join Workspace'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
