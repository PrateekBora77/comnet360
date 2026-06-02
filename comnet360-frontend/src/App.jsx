import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { PageSpinner } from './components/ui/Spinner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ServicesPage from './pages/services/ServicesPage';
import ServiceDetailPage from './pages/services/ServiceDetailPage';
import IncidentsPage from './pages/incidents/IncidentsPage';
import IncidentDetailPage from './pages/incidents/IncidentDetailPage';
import UsagePage from './pages/usage/UsagePage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import UsersPage from './pages/admin/UsersPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import ProfilePage from './pages/profile/ProfilePage';

/** Redirect logged-in users away from public pages to dashboard */
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

/** Wrap protected routes — redirect unauthenticated users to login page */
function PrivateOutlet() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

/**
 * Role-based route guard.
 * If user's role is in the blockedRoles list → redirect to /dashboard.
 * Otherwise render the page normally.
 */
function RoleGuard({ blockedRoles, children }) {
  const { user } = useAuth();
  if (user && blockedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// Roles that cannot access service/incident/analytics pages
const NON_ENTERPRISE = ['ADMIN', 'SERVICE_MANAGER', 'NETWORK_ENGINEER', 'OPERATIONS_HEAD', 'COMPLIANCE_OFFICER'];

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />

      {/* Protected */}
      <Route element={<PrivateOutlet />}>
        <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />

        {/* ENTERPRISE_USER blocked — redirected to /dashboard */}
        <Route path="/services" element={
          <RoleGuard blockedRoles={['ENTERPRISE_USER']}>
            <ErrorBoundary><ServicesPage /></ErrorBoundary>
          </RoleGuard>
        } />
        <Route path="/services/:id" element={
          <RoleGuard blockedRoles={['ENTERPRISE_USER']}>
            <ErrorBoundary><ServiceDetailPage /></ErrorBoundary>
          </RoleGuard>
        } />
        <Route path="/incidents" element={
          <RoleGuard blockedRoles={['ENTERPRISE_USER']}>
            <ErrorBoundary><IncidentsPage /></ErrorBoundary>
          </RoleGuard>
        } />
        <Route path="/incidents/:id" element={
          <RoleGuard blockedRoles={['ENTERPRISE_USER']}>
            <ErrorBoundary><IncidentDetailPage /></ErrorBoundary>
          </RoleGuard>
        } />
        <Route path="/analytics" element={
          <RoleGuard blockedRoles={['ENTERPRISE_USER']}>
            <ErrorBoundary><AnalyticsPage /></ErrorBoundary>
          </RoleGuard>
        } />

        {/* ADMIN only pages — non-admin redirected to /dashboard */}
        <Route path="/admin/users" element={
          <RoleGuard blockedRoles={['SERVICE_MANAGER','NETWORK_ENGINEER','OPERATIONS_HEAD','COMPLIANCE_OFFICER','ENTERPRISE_USER']}>
            <ErrorBoundary><UsersPage /></ErrorBoundary>
          </RoleGuard>
        } />
        <Route path="/admin/audit-logs" element={
          <RoleGuard blockedRoles={['SERVICE_MANAGER','NETWORK_ENGINEER','OPERATIONS_HEAD','ENTERPRISE_USER']}>
            <ErrorBoundary><AuditLogsPage /></ErrorBoundary>
          </RoleGuard>
        } />

        {/* Open to all logged-in users */}
        <Route path="/usage" element={<ErrorBoundary><UsagePage /></ErrorBoundary>} />
        <Route path="/notifications" element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
        <Route path="/profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}