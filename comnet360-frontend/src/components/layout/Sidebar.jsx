import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Server, AlertTriangle, BarChart2,
  Bell, Users, ClipboardList, Activity, Shield, ChevronRight, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const nav = [
  { to: '/dashboard',        label: 'Dashboard',    icon: <LayoutDashboard className="w-4 h-4" /> },
  { to: '/services',         label: 'Services',      icon: <Server className="w-4 h-4" /> },
  { to: '/incidents',        label: 'Incidents',     icon: <AlertTriangle className="w-4 h-4" /> },
  { to: '/usage',            label: 'Usage & SLA',   icon: <Activity className="w-4 h-4" /> },
  {
    to: '/analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" />,
    roles: ['ADMIN','SERVICE_MANAGER','OPERATIONS_HEAD','COMPLIANCE_OFFICER'],
  },
  { to: '/notifications',    label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { to: '/admin/users',      label: 'Users',         icon: <Users className="w-4 h-4" />,         roles: ['ADMIN'] },
  { to: '/admin/audit-logs', label: 'Audit Logs',    icon: <ClipboardList className="w-4 h-4" />, roles: ['ADMIN','COMPLIANCE_OFFICER'] },
];

export default function Sidebar({ open = false, onClose }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const visible = nav.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  /* ── theme tokens ───────────────────────────────────────────────────────── */
  const bg          = isDark ? 'linear-gradient(180deg, #060C18 0%, #080F1E 100%)' : '#ffffff';
  const border      = isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0';
  const navLabel    = isDark ? 'text-slate-600' : 'text-slate-400';
  const inactiveNav = isDark
    ? 'text-slate-400 hover:text-white hover:bg-white/5'
    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100';
  const userName    = isDark ? '#f1f5f9' : '#0f172a';
  const userRole    = isDark ? '#64748b' : '#94a3b8';
  const footerHover = isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50';

  const sidebarContent = (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col h-full select-none"
      style={{ background: bg, borderRight: border }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: border }}>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #06B6D4)', boxShadow: '0 4px 16px rgba(14,165,233,0.4)' }}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            <span style={{ color: isDark ? '#FFFFFF' : '#0f172a' }}>Comnet</span>
            <span style={{ color: '#06B6D4' }}>-360</span>
          </p>
          <p className="text-[10px] font-medium" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
            Service Management
          </p>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav label */}
      <p className={`px-5 pt-5 pb-2 text-[10px] font-black uppercase tracking-widest ${navLabel}`}>
        Navigation
      </p>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4">
        {visible.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 group relative ${
                isActive ? 'text-white' : inactiveNav
              }`
            }
            style={({ isActive }) => isActive ? {
              background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(6,182,212,0.1))',
              borderLeft: '2px solid #0EA5E9',
              paddingLeft: '10px',
            } : {}}
          >
            {({ isActive }) => (
              <>
                <span className={`transition-colors ${
                  isActive
                    ? 'text-sky-400'
                    : isDark
                      ? 'text-slate-500 group-hover:text-slate-300'
                      : 'text-slate-400 group-hover:text-slate-700'
                }`}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-sky-400 opacity-70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <NavLink
          to="/profile"
          onClick={onClose}
          className={`flex items-center gap-3 px-4 py-4 transition-colors ${footerHover}`}
          style={{ borderTop: border }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #06B6D4)' }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold truncate" style={{ color: userName }}>{user.name}</p>
            <p className="text-[10px] truncate" style={{ color: userRole }}>{user.role.replace(/_/g, ' ')}</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" title="Online" />
        </NavLink>
      )}
    </aside>
  );

  return (
    <>
      {/* ── Desktop: always-visible sidebar ─────────────────────────────────── */}
      <div className="hidden lg:flex h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* ── Mobile: slide-in overlay ─────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 h-full transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
