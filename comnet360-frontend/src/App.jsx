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

/** Wrap protected routes — redirect unauthenticated users to landing page */
function PrivateOutlet() {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/" replace />;
  return <AppLayout />;
}

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
        <Route path="/services" element={<ErrorBoundary><ServicesPage /></ErrorBoundary>} />
        <Route path="/services/:id" element={<ErrorBoundary><ServiceDetailPage /></ErrorBoundary>} />
        <Route path="/incidents" element={<ErrorBoundary><IncidentsPage /></ErrorBoundary>} />
        <Route path="/incidents/:id" element={<ErrorBoundary><IncidentDetailPage /></ErrorBoundary>} />
        <Route path="/usage" element={<ErrorBoundary><UsagePage /></ErrorBoundary>} />
        <Route path="/analytics" element={<ErrorBoundary><AnalyticsPage /></ErrorBoundary>} />
        <Route path="/notifications" element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
        <Route path="/admin/users" element={<ErrorBoundary><UsersPage /></ErrorBoundary>} />
        <Route path="/admin/audit-logs" element={<ErrorBoundary><AuditLogsPage /></ErrorBoundary>} />
        <Route path="/profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
