import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ClassDetail from './pages/ClassDetail';
import MaterialHub from './pages/MaterialHub';
import AssignmentDetail from './pages/AssignmentDetail';
import SqlLogsPage from './pages/SqlLogsPage';

function HomeRedirect() {
  const { profile, user } = useAuth();
  const role = profile?.role || user?.user_metadata?.role || 'student';
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/student" replace />;
}

function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/sql"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MainLayout>
              <SqlLogsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <MainLayout>
              <TeacherDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/assignments"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <MainLayout>
              <MaterialHub />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/analytics"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <MainLayout>
              <TeacherDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>
            <MainLayout>
              <StudentDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/assignments"
        element={
          <ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>
            <MainLayout>
              <StudentDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/history"
        element={
          <ProtectedRoute allowedRoles={['student', 'admin', 'teacher']}>
            <MainLayout>
              <StudentDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/classes"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/classes/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ClassDetail />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/materials"
        element={
          <ProtectedRoute>
            <MainLayout>
              <MaterialHub />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/assignments/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <AssignmentDetail />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
