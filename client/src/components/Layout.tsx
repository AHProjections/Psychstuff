import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils';
import {
  LayoutDashboard, Users, BarChart2, LogOut, Menu, X, Sprout,
  HeartPulse, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const providerNav: NavItem[] = [
    { to: '/provider', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  ];

  const patientNav: NavItem[] = [
    { to: '/patient', label: 'My Dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/patient/insights', label: 'Insights', icon: <BarChart2 size={18} /> },
  ];

  const nav = user?.role === 'provider' ? providerNav : patientNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-white border-r border-slate-100 w-64">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Sprout size={16} className="text-white" />
        </div>
        <div>
          <span className="font-bold text-slate-800 text-base">Flourish</span>
          <p className="text-xs text-slate-400 -mt-0.5">Mental Wellness</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(item => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to + '/'))
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            )}
          >
            <span className={clsx(
              location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to + '/'))
                ? 'text-indigo-600' : 'text-slate-400'
            )}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Role badge */}
      <div className="px-3 mx-3 mb-3 py-2.5 bg-slate-50 rounded-xl">
        <div className="flex items-center gap-1.5 mb-1">
          <HeartPulse size={13} className="text-slate-400" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            {user?.role === 'provider' ? 'Provider View' : 'Patient View'}
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {user?.role === 'provider'
            ? 'Manage patients and treatment plans'
            : 'Track your wellness journey'}
        </p>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: user?.avatar_color }}
          >
            {initials(user?.name ?? '')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
            <Menu size={20} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <Sprout size={12} className="text-white" />
            </div>
            <span className="font-bold text-slate-800">Flourish</span>
          </div>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: user?.avatar_color }}
          >
            {initials(user?.name ?? '')}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// Breadcrumb helper
export function PageHeader({
  title, subtitle, breadcrumbs, actions
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {breadcrumbs && (
          <nav className="flex items-center gap-1 mb-1">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={13} className="text-slate-300" />}
                {b.to ? (
                  <Link to={b.to} className="text-xs text-slate-400 hover:text-slate-600">{b.label}</Link>
                ) : (
                  <span className="text-xs text-slate-500">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
