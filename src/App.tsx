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
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'superadmin' ? '/superadmin' : user.role === 'teacher' ? '/teacher' : '/dashboard'} replace />;
  return <>{children}</>;
}

function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center" style={{ minHeight: '100vh' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'superadmin' ? '/superadmin' : user.role === 'teacher' ? '/teacher' : '/dashboard'} replace />;
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

      <Route path="/admin" element={<Navigate to="/teacher" replace />} />

      <Route path="/teacher" element={
        <ProtectedRoute roles={['teacher', 'superadmin']}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/teacher/users" element={
        <ProtectedRoute roles={['teacher', 'superadmin']}><AdminLayout><AdminUsers /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/teacher/courses" element={
        <ProtectedRoute roles={['teacher', 'superadmin']}><AdminLayout><AdminCourses /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/teacher/live-classes" element={
        <ProtectedRoute roles={['teacher', 'superadmin']}><AdminLayout><AdminLiveClasses /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/teacher/recorded" element={
        <ProtectedRoute roles={['teacher', 'superadmin']}><AdminLayout><AdminRecorded /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/teacher/assignments" element={
        <ProtectedRoute roles={['teacher', 'superadmin']}><AdminLayout><AdminAssignments /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/teacher/batches" element={
        <ProtectedRoute roles={['teacher', 'superadmin']}><AdminLayout><AdminBatches /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/teacher/curriculum" element={
        <ProtectedRoute roles={['teacher', 'superadmin']}><AdminLayout><AdminCurriculum /></AdminLayout></ProtectedRoute>
      } />
      <Route path="/teacher/appointments" element={
        <ProtectedRoute roles={['teacher', 'superadmin']}><AdminLayout><AdminAppointments /></AdminLayout></ProtectedRoute>
      } />

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
