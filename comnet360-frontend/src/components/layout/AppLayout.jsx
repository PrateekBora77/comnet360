import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useRealtime } from '../../hooks/useRealtime';
// useRealtime is kept for background polling (toasts, cache invalidation)

const pageTitles = {
  '/dashboard':        'Dashboard',
  '/services':         'Services',
  '/incidents':        'Incidents',
  '/usage':            'Usage & SLA',
  '/analytics':        'Analytics',
  '/notifications':    'Notifications',
  '/admin/users':      'User Management',
  '/admin/audit-logs': 'Audit Logs',
  '/profile':          'My Profile',
};

export default function AppLayout() {
  const { pathname } = useLocation();
  useRealtime(); // keeps background polling + toasts active
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const title = Object.entries(pageTitles).find(
    ([path]) => pathname === path || pathname.startsWith(path + '/')
  )?.[1] ?? 'Comnet-360';

  return (
    <div className="flex h-screen overflow-hidden bg-sky-50/40">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
