import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, Wifi, WifiOff, RefreshCw, Sun, Moon, Menu } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { notificationsApi } from '../../api/notifications';
import { NOTIFICATION_INTERVAL } from '../../hooks/useRealtime';
import toast from 'react-hot-toast';

// Seconds between polls — drives the countdown timer
const REFRESH_EVERY_S = NOTIFICATION_INTERVAL / 1000;

export default function TopBar({ title, isLive = true, lastUpdated = null, onMenuClick }) {
  const { user, logout } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // ── Countdown & sync animation ────────────────────────────────────────────
  const [countdown, setCountdown] = useState(REFRESH_EVERY_S);
  const [syncing,   setSyncing]   = useState(false);

  // When lastUpdated changes a new poll just finished → reset countdown
  useEffect(() => {
    if (!lastUpdated) return;
    setSyncing(true);
    setCountdown(REFRESH_EVERY_S);
    const t = setTimeout(() => setSyncing(false), 900);
    return () => clearTimeout(t);
  }, [lastUpdated]);

  // Tick every second
  useEffect(() => {
    if (!isLive) return;
    const tick = setInterval(
      () => setCountdown((p) => (p <= 1 ? REFRESH_EVERY_S : p - 1)),
      1000
    );
    return () => clearInterval(tick);
  }, [isLive, lastUpdated]);

  // Progress bar 0 → 100 as we approach the next sync
  const barProgress = Math.round(((REFRESH_EVERY_S - countdown) / REFRESH_EVERY_S) * 100);

  // ── Notification count ────────────────────────────────────────────────────
  const { data: countData } = useQuery({
    queryKey: ['notifications-count', user?.userId],
    queryFn:  () => notificationsApi.getUnreadCount(user.userId).then(r => r.data),
    enabled:  !!user,
    // useRealtime invalidates this key after each poll; staleTime prevents an
    // extra fetch when the component mounts right after a poll just ran.
    staleTime: 8_000,
  });
  const unreadCount = countData?.unreadCount ?? 0;

  const handleLogout = async () => {
    // Cancel all in-flight queries before clearing state to avoid
    // stale 401 responses from triggering the interceptor's redirect.
    await qc.cancelQueries();
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <header
      className="h-14 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-700 relative overflow-hidden"
      style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.04)' }}
    >
      {/* ── Left: hamburger (mobile) + title + live badge ───────────── */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Hamburger — visible only on mobile/tablet */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-[14px] sm:text-[15px] font-black text-slate-900 dark:text-white tracking-tight truncate">
          {title}
        </h1>

        {/* Live / Offline pill */}
        <div className={`hidden sm:flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
          isLive
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : 'text-rose-600 bg-rose-50 border-rose-200'
        }`}>
          {isLive ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3 h-3" />
              Live
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              Offline
            </>
          )}
        </div>

        {/* Sync status / countdown — hidden on small screens */}
        {isLive && (
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium">
            {syncing ? (
              <>
                <RefreshCw className="w-3 h-3 text-sky-500 animate-spin" />
                <span className="text-sky-500 font-semibold">Syncing…</span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 tabular-nums">
                {formattedTime ? `Updated ${formattedTime}` : 'Connecting…'}
                {formattedTime && (
                  <span className="text-slate-300 dark:text-slate-600"> · next in {countdown}s</span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Right: actions ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-sky-600 dark:hover:text-sky-400 transition-all cursor-pointer"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification bell */}
        <Link
          to="/notifications"
          className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-sky-600 dark:hover:text-sky-400 transition-all"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Profile */}
        <Link
          to="/profile"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-sky-600 dark:hover:text-sky-400 transition-all"
          title="Profile"
        >
          <User className="w-4 h-4" />
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* ── Refresh progress bar (absolute, bottom of header) ──────────── */}
      {isLive && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{
              width: `${barProgress}%`,
              background: syncing
                ? 'linear-gradient(90deg, #38bdf8, #22d3ee)'
                : 'linear-gradient(90deg, #0EA5E9 0%, #06B6D4 60%, #10B981 100%)',
            }}
          />
        </div>
      )}
    </header>
  );
}
