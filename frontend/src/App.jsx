import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import Employees from './pages/Employees.jsx';
import Organization from './pages/Organization.jsx';
import Payroll from './pages/Payroll.jsx';
import Leave from './pages/Leave.jsx';
import Audit from './pages/Audit.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Attendance from './pages/Attendance.jsx';
import Appointments from './pages/Appointments.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './components/NotFound.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import { ToastProvider } from './components/Toast.jsx';

import { useAuthStore } from './stores/authStore.js';

function Protected({ children }) {
  const { user, hydrate } = useAuthStore();
  if (typeof window !== 'undefined' && !user) {
    hydrate();
  }
  const auth = useAuthStore((s) => s.user);
  return auth ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Protected><UserDashboard /></Protected>} />
            <Route path="/employees" element={<Protected><Employees /></Protected>} />
            <Route path="/organization" element={<Protected><Organization /></Protected>} />
            <Route path="/payroll" element={<Protected><Payroll /></Protected>} />
            <Route path="/leave" element={<Protected><Leave /></Protected>} />
            <Route path="/audit" element={<Protected><Audit /></Protected>} />
            <Route path="/reports" element={<Protected><Reports /></Protected>} />
            <Route path="/users" element={<Protected><Users /></Protected>} />
            <Route path="/attendance" element={<Protected><Attendance /></Protected>} />
            <Route path="/appointments" element={<Protected><Appointments /></Protected>} />
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CommandPalette />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
