import { NavLink } from 'react-router-dom';
import {
  Home, Layers, AlertCircle, BarChart,
  Bell, User, FileText, TrendingUp, Shield, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
  {
    to: '/services', label: 'Services', icon: <Layers className="w-4 h-4" />,
    roles: ['ADMIN', 'SERVICE_MANAGER', 'NETWORK_ENGINEER', 'OPERATIONS_HEAD', 'COMPLIANCE_OFFICER'],
  },
  {
    to: '/incidents', label: 'Incidents', icon: <AlertCircle className="w-4 h-4" />,
    roles: ['ADMIN', 'SERVICE_MANAGER', 'NETWORK_ENGINEER', 'OPERATIONS_HEAD', 'COMPLIANCE_OFFICER'],
  },
  { to: '/usage', label: 'Usage & SLA', icon: <TrendingUp className="w-4 h-4" /> },
  {
    to: '/analytics', label: 'Analytics', icon: <BarChart className="w-4 h-4" />,
    roles: ['ADMIN', 'SERVICE_MANAGER', 'OPERATIONS_HEAD', 'COMPLIANCE_OFFICER'],
  },
  { to: '/notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { to: '/admin/users',      label: 'Users',      icon: <User className="w-4 h-4" />,     roles: ['ADMIN'] },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: <FileText className="w-4 h-4" />, roles: ['ADMIN', 'COMPLIANCE_OFFICER'] },
];

export default function Sidebar({ open = false, onClose }) {
  const { user } = useAuth();
  const visible = nav.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  const sidebarContent = (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-full select-none bg-white border-r border-sky-100">

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sky-50">
        <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-sky-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-slate-900 tracking-tight leading-tight">
            Comnet<span className="text-sky-400">-360</span>
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Service Management</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav label */}
      <p className="px-5 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
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
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-sky-50/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-sky-500' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />}
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
          className="flex items-center gap-3 px-4 py-4 border-t border-sky-50 hover:bg-sky-50/60 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 text-[11px] font-bold flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-slate-800 truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.role.replace(/_/g, ' ')}</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Online" />
        </NavLink>
      )}
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex h-screen sticky top-0">{sidebarContent}</div>

      {/* Mobile overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
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