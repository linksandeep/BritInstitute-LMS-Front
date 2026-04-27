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
import AdminCurriculum from './pages/admin/AdminCurriculum';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperAdminTeachers from './pages/superadmin/SuperAdminTeachers';

// Route guard
function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-center" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'superadmin' ? '/superadmin' : user.role === 'student' ? '/dashboard' : '/admin'} replace />;
  }
  return <>{children}</>;
}

function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center" style={{ minHeight: '100vh' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'superadmin' ? '/superadmin' : user.role === 'student' ? '/dashboard' : '/admin'} replace />;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardRedirect />} />

      {/* Student */}
      <Route path="/dashboard" element={
        <ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute roles={['admin', 'teacher', 'superadmin']}><AdminShell><AdminDashboard /></AdminShell></ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute roles={['admin', 'teacher', 'superadmin']}><AdminShell><AdminUsers /></AdminShell></ProtectedRoute>
      } />
      <Route path="/admin/courses" element={
        <ProtectedRoute roles={['admin', 'teacher', 'superadmin']}><AdminShell><AdminCourses /></AdminShell></ProtectedRoute>
      } />
      <Route path="/admin/live-classes" element={
        <ProtectedRoute roles={['admin', 'teacher', 'superadmin']}><AdminShell><AdminLiveClasses /></AdminShell></ProtectedRoute>
      } />
      <Route path="/admin/recorded" element={
        <ProtectedRoute roles={['admin', 'teacher', 'superadmin']}><AdminShell><AdminRecorded /></AdminShell></ProtectedRoute>
      } />
      <Route path="/admin/assignments" element={
        <ProtectedRoute roles={['admin', 'teacher', 'superadmin']}><AdminShell><AdminAssignments /></AdminShell></ProtectedRoute>
      } />
      <Route path="/admin/batches" element={
        <ProtectedRoute roles={['admin', 'teacher', 'superadmin']}><AdminShell><AdminBatches /></AdminShell></ProtectedRoute>
      } />
      <Route path="/admin/curriculum" element={
        <ProtectedRoute roles={['admin', 'teacher', 'superadmin']}><AdminShell><AdminCurriculum /></AdminShell></ProtectedRoute>
      } />
      <Route path="/admin/appointments" element={
        <ProtectedRoute roles={['admin', 'teacher', 'superadmin']}><AdminShell><AdminAppointments /></AdminShell></ProtectedRoute>
      } />

      <Route path="/teacher" element={<Navigate to="/admin" replace />} />
      <Route path="/teacher/users" element={<Navigate to="/admin/users" replace />} />
      <Route path="/teacher/courses" element={<Navigate to="/admin/courses" replace />} />
      <Route path="/teacher/live-classes" element={<Navigate to="/admin/live-classes" replace />} />
      <Route path="/teacher/recorded" element={<Navigate to="/admin/recorded" replace />} />
      <Route path="/teacher/assignments" element={<Navigate to="/admin/assignments" replace />} />
      <Route path="/teacher/batches" element={<Navigate to="/admin/batches" replace />} />
      <Route path="/teacher/curriculum" element={<Navigate to="/admin/curriculum" replace />} />
      <Route path="/teacher/appointments" element={<Navigate to="/admin/appointments" replace />} />

      <Route path="/superadmin" element={
        <ProtectedRoute roles={['superadmin']}><SuperAdminLayout><SuperAdminTeachers /></SuperAdminLayout></ProtectedRoute>
      } />
      <Route path="/superadmin/teachers" element={
        <ProtectedRoute roles={['superadmin']}><SuperAdminLayout><SuperAdminTeachers /></SuperAdminLayout></ProtectedRoute>
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
