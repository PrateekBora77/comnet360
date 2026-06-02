import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, Menu } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { notificationsApi } from '../../api/notifications';
import toast from 'react-hot-toast';

export default function TopBar({ title, onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ['notifications-count', user?.userId],
    queryFn:  () => notificationsApi.getUnreadCount(user.userId).then(r => r.data),
    enabled:  !!user,
    staleTime: 8_000,
  });
  const unreadCount = countData?.unreadCount ?? 0;

  const handleLogout = async () => {
    await qc.cancelQueries();
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-10 bg-white border-b border-sky-100">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-semibold text-slate-800 truncate">{title}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Profile */}
        <Link
          to="/profile"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
          title="Profile"
        >
          <User className="w-4 h-4" />
        </Link>

        <div className="w-px h-4 bg-sky-100 mx-1" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
