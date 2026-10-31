import {BillSyncLogo} from '../common/BillSyncLogo';
import React from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  Users,
  FileText,
  Repeat,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavItemKey =
  | 'dashboard'
  | 'products'
  | 'plans'
  | 'customers'
  | 'quotations'
  | 'subscriptions'
  | 'invoices'
  | 'payments'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentNav: NavItemKey;
  onNavigate: (nav: NavItemKey) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentNav,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { role, user, logout } = useAuth();

  // Navigation items defined according to requirements
  const allNavItems = [
    {
      key: 'dashboard' as NavItemKey,
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'staff', 'customer'],
    },
    {
      key: 'products' as NavItemKey,
      label: 'Products',
      icon: Package,
      roles: ['admin', 'staff'],
    },
    {
      key: 'plans' as NavItemKey,
      label: 'Subscription Plans',
      icon: Layers,
      roles: ['admin', 'staff'],
    },
    {
      key: 'customers' as NavItemKey,
      label: 'Customers',
      icon: Users,
      roles: ['admin', 'staff'],
    },
    {
      key: 'quotations' as NavItemKey,
      label: role === 'customer' ? 'My Quotations' : 'Quotations',
      icon: FileText,
      roles: ['admin', 'staff', 'customer'],
    },
    {
      key: 'subscriptions' as NavItemKey,
      label: role === 'customer' ? 'My Subscriptions' : 'Subscriptions',
      icon: Repeat,
      roles: ['admin', 'staff', 'customer'],
    },
    {
      key: 'invoices' as NavItemKey,
      label: role === 'customer' ? 'My Invoices' : 'Invoices',
      icon: Receipt,
      roles: ['admin', 'staff', 'customer'],
    },
    {
      key: 'payments' as NavItemKey,
      label: role === 'customer' ? 'Payment History' : 'Payments',
      icon: CreditCard,
      roles: ['admin', 'staff', 'customer'],
    },
    {
      key: 'analytics' as NavItemKey,
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['admin'],
    },
    {
      key: 'settings' as NavItemKey,
      label: 'Settings',
      icon: Settings,
      roles: ['admin', 'staff', 'customer'],
    },
  ];

  // Filter based on active role
  const visibleNavItems = allNavItems.filter((item) => item.roles.includes(role));

  const handleItemClick = (key: NavItemKey) => {
    onNavigate(key);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container: Deep navy/slate `#0f172a` */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 flex-shrink-0">
              <BillSyncLogo/>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold text-white tracking-tight truncate">
                  BillSync
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-400">
                  Software
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              {role === 'customer' ? 'Subscriber Portal' : 'Main Menu'}
            </div>
          )}

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentNav === item.key;

            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item.key)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                {isActive && (
                  <span
                    className={`absolute right-2 w-1.5 h-1.5 rounded-full bg-white ${
                      isCollapsed ? 'hidden' : 'block'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'BL'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-blue-400 uppercase font-medium tracking-wider">
                  {role}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={logout}
                title="Log Out"
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-md hover:bg-slate-700/50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
