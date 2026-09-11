import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import TenantRegister from './pages/TenantRegister.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import Employees from './pages/Employees.jsx';
import Organization from './pages/Organization.jsx';
import Payroll from './pages/Payroll.jsx';
import Leave from './pages/Leave.jsx';
import Audit from './pages/Audit.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Attendance from './pages/Attendance.jsx';
import BiometricAttendance from './pages/BiometricAttendance.jsx';
import Appointments from './pages/Appointments.jsx';
import Settings from './pages/Settings.jsx';
import Performance from './pages/Performance.jsx';
import Plantilla from './pages/Plantilla.jsx';
import Vacancy from './pages/Vacancy.jsx';
import Designation from './pages/Designation.jsx';
import Learning from './pages/Learning.jsx';
import Recruitment from './pages/Recruitment.jsx';
import ESS from './pages/ESS.jsx';
import IPCR from './pages/IPCR.jsx';
import Disqualifications from './pages/Disqualifications.jsx';
import Help from './pages/Help.jsx';
import NotFound from './components/NotFound.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import { ToastProvider } from './components/Toast.jsx';

import { useAuthStore } from './stores/authStore.js';

function Protected({ children, roles }) {
  const user = useAuthStore(s => s.user);
  const hydrate = useAuthStore(s => s.hydrate);
  const [ready, setReady] = React.useState(!!user);
  React.useEffect(() => {
    if (!user) hydrate();
    setReady(true);
  }, [user, hydrate]);
  if (!ready) return null;
  if (!useAuthStore.getState().user) return <Navigate to="/" replace />;
  const current = useAuthStore.getState().user;
  if (roles && !roles.includes(current.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/tenant-register" element={<TenantRegister />} />
            <Route path="/dashboard" element={<Protected><UserDashboard /></Protected>} />
            <Route path="/employees" element={<Protected roles={['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD']}><Employees /></Protected>} />
            <Route path="/organization" element={<Protected><Organization /></Protected>} />
            <Route path="/payroll" element={<Protected roles={['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER']}><Payroll /></Protected>} />
            <Route path="/leave" element={<Protected roles={['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD']}><Leave /></Protected>} />
            <Route path="/audit" element={<Protected roles={['ADMIN', 'AUDITOR']}><Audit /></Protected>} />
            <Route path="/reports" element={<Protected roles={['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'AUDITOR']}><Reports /></Protected>} />
            <Route path="/users" element={<Protected roles={['ADMIN']}><Users /></Protected>} />
            <Route path="/attendance" element={<Protected roles={['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD']}><Attendance /></Protected>} />
            <Route path="/biometric" element={<Protected roles={['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'PAYROLL_OFFICER']}><BiometricAttendance /></Protected>} />
            <Route path="/appointments" element={<Protected roles={['ADMIN', 'HR_MANAGER']}><Appointments /></Protected>} />
            <Route path="/performance" element={<Protected roles={['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD']}><Performance /></Protected>} />
            <Route path="/plantilla" element={<Protected roles={['ADMIN', 'HR_MANAGER']}><Plantilla /></Protected>} />
            <Route path="/vacancy" element={<Protected roles={['ADMIN', 'HR_MANAGER']}><Vacancy /></Protected>} />
            <Route path="/designation" element={<Protected roles={['ADMIN', 'HR_MANAGER']}><Designation /></Protected>} />
            <Route path="/learning" element={<Protected><Learning /></Protected>} />
            <Route path="/recruitment" element={<Protected roles={['ADMIN', 'HR_MANAGER']}><Recruitment /></Protected>} />
            <Route path="/ess" element={<Protected><ESS /></Protected>} />
            <Route path="/ipcr" element={<Protected roles={['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD']}><IPCR /></Protected>} />
            <Route path="/disqualifications" element={<Protected roles={['ADMIN', 'HR_MANAGER']}><Disqualifications /></Protected>} />
            <Route path="/settings" element={<Protected><Settings /></Protected>} />
            <Route path="/help" element={<Protected><Help /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CommandPalette />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
