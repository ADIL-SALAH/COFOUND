import React, { useEffect, useState } from 'react';
import api from '../api/client.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { WorkspaceMember } from '../types/index.ts';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import {
  Users,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  KeyRound,
  AlertTriangle,
  LogOut,
} from 'lucide-react';

export const MembersPage: React.FC = () => {
  const { currentWorkspace, user, refreshUserData, deleteWorkspace, leaveWorkspace } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState(currentWorkspace?.inviteCode || '');
  const [copied, setCopied] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Member to remove confirm dialog
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);

  // Workspace deletion and leave confirm dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);

  const fetchMembers = async () => {
    if (!currentWorkspace) return;
    try {
      const [memRes, wsRes] = await Promise.all([
        api.get(`/workspaces/${currentWorkspace.id}/members`),
        api.get(`/workspaces/${currentWorkspace.id}`),
      ]);
      setMembers(memRes.data);
      if (wsRes.data.inviteCode) {
        setInviteCode(wsRes.data.inviteCode);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentWorkspace]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateNewCode = async () => {
    if (!currentWorkspace) return;
    setGeneratingCode(true);
    try {
      const res = await api.post(`/workspaces/${currentWorkspace.id}/invitations`);
      setInviteCode(res.data.inviteCode);
      await refreshUserData();
    } catch (err: any) {
      alert('Failed to generate new invitation code.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !currentWorkspace) return;
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/members/${memberToRemove.id}`);
      setMemberToRemove(null);
      await fetchMembers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove member.');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace) return;
    setActionProcessing(true);
    try {
      await deleteWorkspace(currentWorkspace.id);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete workspace.');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!currentWorkspace) return;
    setActionProcessing(true);
    try {
      await leaveWorkspace(currentWorkspace.id);
      setShowLeaveConfirm(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to leave workspace.');
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
          Team Members & Partner Workspace
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Authorized partners with shared access to goals, expenses, and wallets
        </p>
      </div>

      {/* Partner Invitation Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Partner Invitation Code</h2>
            </div>
            <p className="text-xs text-slate-500">
              Share this code with your business partner to join "{currentWorkspace?.name}".
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-bold tracking-widest text-slate-900">
              {inviteCode || 'GENERATING'}
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            {currentWorkspace?.isOwner && (
              <button
                onClick={handleGenerateNewCode}
                disabled={generatingCode}
                title="Generate new code"
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generatingCode ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Active Workspace Partners ({members.length})
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Loading members...</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((m) => {
              const isCurrentUser = m.id === user?.id;
              const isOwner = m.role === 'owner';
              return (
                <div
                  key={m.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{m.name}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            You
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold capitalize ${
                            isOwner
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {m.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {m.email} {m.phone && <span>&bull; {m.phone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">
                      Joined {new Date(m.joinedAt).toLocaleDateString()}
                    </span>

                    {currentWorkspace?.isOwner && !isCurrentUser && !isOwner && (
                      <button
                        onClick={() => setMemberToRemove(m)}
                        title="Remove team member"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger Zone: Workspace Management */}
      <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h2 className="text-sm font-bold text-red-900">
                {currentWorkspace?.isOwner ? 'Delete Workspace' : 'Leave Workspace'}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {currentWorkspace?.isOwner
                ? `Permanently delete "${currentWorkspace.name}" and all associated goals, tasks, expenses, company wallets, and transactions.`
                : `Leave "${currentWorkspace?.name}". You will lose access until re-invited by a workspace owner.`}
            </p>
          </div>

          <div>
            {currentWorkspace?.isOwner ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Workspace</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 text-xs font-semibold rounded-xl transition-colors border border-slate-200 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Remove Partner Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${memberToRemove?.name} from this workspace? They will lose access to shared tasks and financial accounts.`}
        confirmLabel="Remove Partner"
        isDestructive
      />

      {/* Delete Workspace Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteWorkspace}
        title="Permanently Delete Workspace"
        message={`Are you sure you want to delete "${currentWorkspace?.name}"? All business goals, tasks, expenses, company wallets, ledger transactions, and receipts will be permanently erased. This action cannot be undone.`}
        confirmLabel="Yes, Delete Workspace"
        isDestructive
        loading={actionProcessing}
      />

      {/* Leave Workspace Confirmation */}
      <ConfirmDialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeaveWorkspace}
        title="Leave Workspace"
        message={`Are you sure you want to leave "${currentWorkspace?.name}"? You will lose access to shared goals, expenses, and accounts until re-invited.`}
        confirmLabel="Leave Workspace"
        isDestructive
        loading={actionProcessing}
      />
    </div>
  );
};
