import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Building2,
  Copy,
  Check,
  LogOut,
  ChevronDown,
  User as UserIcon,
  ShieldCheck,
  Plus,
  Settings,
} from 'lucide-react';

interface NavbarProps {
  onOpenCreateWorkspace: () => void;
  onOpenJoinWorkspace: () => void;
  onOpenManageWorkspace?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreateWorkspace,
  onOpenJoinWorkspace,
  onOpenManageWorkspace,
}) => {
  const { user, currentWorkspace, workspaces, selectWorkspace, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = () => {
    if (currentWorkspace?.inviteCode) {
      navigator.clipboard.writeText(currentWorkspace.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-3.5 bg-white border-b border-slate-200">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
            CF
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
            CoFound
          </span>
        </div>

        {/* Workspace Switcher */}
        {currentWorkspace && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors whitespace-nowrap"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-800">{currentWorkspace.name}</span>
              <span className="text-slate-400 capitalize">({currentWorkspace.role})</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div
                className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50"
                onClick={() => setDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Your Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => selectWorkspace(ws)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                      ws.id === currentWorkspace.id ? 'bg-emerald-50/70 text-emerald-900 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span>{ws.name}</span>
                    <span className="text-[11px] text-slate-400 capitalize">{ws.role}</span>
                  </button>
                ))}
                <div className="border-t border-slate-100 my-1"></div>
                {onOpenManageWorkspace && (
                  <button
                    onClick={onOpenManageWorkspace}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Manage / Delete Workspace</span>
                  </button>
                )}
                <button
                  onClick={onOpenCreateWorkspace}
                  className="w-full text-left px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
                </button>
                <button
                  onClick={onOpenJoinWorkspace}
                  className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Join with Invite Code</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone 2: Workspace Trust / Invite Marker */}
      <div className="hidden md:flex items-center gap-3">
        {currentWorkspace?.inviteCode && (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
            <span className="text-slate-400">Invite Code:</span>
            <span className="font-mono font-semibold text-slate-800 tracking-wider">
              {currentWorkspace.inviteCode}
            </span>
            <button
              onClick={handleCopyInvite}
              title="Copy invite code"
              className="p-1 hover:text-emerald-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Zone 3: Authenticated Partner & Actions */}
      <div className="flex items-center gap-4 shrink-0">
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-tight flex items-center gap-1.5">
                <span>{user.name}</span>
                {currentWorkspace?.isOwner && (
                  <span className="text-[10px] text-emerald-700 font-medium">Owner</span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">{user.email}</div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          title="Sign out"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
