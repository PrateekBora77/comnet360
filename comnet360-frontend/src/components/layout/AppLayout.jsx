import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useRealtime } from '../../hooks/useRealtime';

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
  const { isLive, lastUpdated } = useRealtime();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const title = Object.entries(pageTitles).find(
    ([path]) => pathname === path || pathname.startsWith(path + '/')
  )?.[1] ?? 'Comnet-360';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          title={title}
          isLive={isLive}
          lastUpdated={lastUpdated}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
