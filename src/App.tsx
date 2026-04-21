import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/student/StudentDashboard';

// Admin
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCourses from './pages/admin/AdminCourses';
import AdminLiveClasses from './pages/admin/AdminLiveClasses';
import AdminRecorded from './pages/admin/AdminRecorded';
import AdminAssignments from './pages/admin/AdminAssignments';
import AdminBatches from './pages/admin/AdminBatches';
import AdminAppointments from './pages/admin/AdminAppointments';

// Route guard
function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-center" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center" style={{ minHeight: '100vh' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardRedirect />} />

      {/* Student */}
      <Route path="/dashboard" element={
        <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute role="admin"><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute role="admin"><AdminLayout><AdminUsers /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/admin/courses" element={
        <ProtectedRoute role="admin"><AdminLayout><AdminCourses /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/admin/live-classes" element={
        <ProtectedRoute role="admin"><AdminLayout><AdminLiveClasses /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/admin/recorded" element={
        <ProtectedRoute role="admin"><AdminLayout><AdminRecorded /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/admin/assignments" element={
        <ProtectedRoute role="admin"><AdminLayout><AdminAssignments /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/admin/batches" element={
        <ProtectedRoute role="admin"><AdminLayout><AdminBatches /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/admin/appointments" element={
        <ProtectedRoute role="admin"><AdminLayout><AdminAppointments /></AdminLayout></ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
