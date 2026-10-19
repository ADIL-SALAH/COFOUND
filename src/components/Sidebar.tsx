import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Receipt,
  Wallet,
  HandCoins,
  Users,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'tasks'
  | 'expenses'
  | 'wallets'
  | 'reimbursements'
  | 'members';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<any> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Goals & Tasks', icon: CheckSquare },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'wallets', label: 'Company Wallets', icon: Wallet },
    { id: 'reimbursements', label: 'Reimbursements', icon: HandCoins },
    { id: 'members', label: 'Team Members', icon: Users },
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-57px)]">
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-emerald-700' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-slate-100 text-[11px] text-slate-400">
        <div className="font-medium text-slate-600">CoFound MVP</div>
        <div>MERN Stack &bull; INR Currency</div>
      </div>
    </aside>
  );
};
