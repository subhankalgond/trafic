import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './index.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import PublicLayout from './components/PublicLayout';
import AppLayout from './components/AppLayout';

import LandingPage from './pages/LandingPage';
import LiveTrafficPage from './pages/LiveTrafficPage';
import SimulationPage from './pages/SimulationPage';
import RoutesPage from './pages/RoutesPage';
import IncidentsPage from './pages/IncidentsPage';
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import DashboardPage from './pages/DashboardPage';
import EmergencyResponsePage from './pages/EmergencyResponsePage';
import ReportIncidentPage from './pages/ReportIncidentPage';
import UserReportsPage from './pages/UserReportsPage';
import SavedRoutesPage from './pages/SavedRoutesPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';

import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import LiveControlPage from './pages/admin/LiveControlPage';
import TrafficManagementPage from './pages/admin/TrafficManagementPage';
import EmergencyAdminPage from './pages/admin/EmergencyAdminPage';
import VehiclesPage from './pages/admin/VehiclesPage';
import AdminIncidentsPage from './pages/admin/AdminIncidentsPage';
import RoadsPage from './pages/admin/RoadsPage';
import SignalsPage from './pages/admin/SignalsPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import UsersPage from './pages/admin/UsersPage';
import SystemLogsPage from './pages/admin/SystemLogsPage';
import SettingsPage from './pages/admin/SettingsPage';

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-extrabold text-white">404</p>
      <p className="text-slate-400">That page does not exist on the SmartFlow network.</p>
      <a href="/" className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-sky-400">
        Back to home
      </a>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* public */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/live-traffic" element={<LiveTrafficPage />} />
              <Route path="/simulation" element={<SimulationPage />} />
              <Route path="/routes" element={<RoutesPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
            </Route>

            {/* auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* signed-in user */}
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/emergency-response" element={<EmergencyResponsePage />} />
              <Route path="/report-incident" element={<ReportIncidentPage />} />
              <Route path="/user-reports" element={<UserReportsPage />} />
              <Route path="/saved-routes" element={<SavedRoutesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* operator / admin control center */}
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AppLayout admin />
                </RequireAuth>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="live-control" element={<LiveControlPage />} />
              <Route path="traffic" element={<TrafficManagementPage />} />
              <Route path="emergency" element={<EmergencyAdminPage />} />
              <Route path="vehicles" element={<VehiclesPage />} />
              <Route path="incidents" element={<AdminIncidentsPage />} />
              <Route path="roads" element={<RoadsPage />} />
              <Route path="signals" element={<SignalsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="logs" element={<SystemLogsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
