import React from 'react';
import { RouterProvider, createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import TenantRegister from './pages/TenantRegister.jsx';
import SuperAdminDashboard from './pages/SuperAdminDashboard.jsx';
import Tenants from './pages/Tenants.jsx';
import TenantDetail from './pages/TenantDetail.jsx';
import DatabaseTools from './pages/DatabaseTools.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import Employees from './pages/Employees.jsx';
import Organization from './pages/Organization.jsx';
import Payroll from './pages/Payroll.jsx';
import Leave from './pages/Leave.jsx';
import Audit from './pages/Audit.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Attendance from './pages/Attendance.jsx';
import AttendancePortal from './pages/AttendancePortal.jsx';
import Devices from './pages/Devices.jsx';
import Appointments from './pages/Appointments.jsx';
import Settings from './pages/Settings.jsx';
import Performance from './pages/Performance.jsx';
import Plantilla from './pages/Plantilla.jsx';
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
import { useUserCapabilities } from './config/permissions.js';
import { sentryWrapCreateBrowserRouter } from './lib/sentry.js';

function Protected({ children, roles, capability }) {
  const user = useAuthStore(s => s.user);
  const hydrate = useAuthStore(s => s.hydrate);
  const caps = useUserCapabilities();
  const [ready, setReady] = React.useState(!!user);
  React.useEffect(() => {
    if (!user) hydrate();
    setReady(true);
  }, [user, hydrate]);
  if (!ready) return null;
  if (!useAuthStore.getState().user) return <Navigate to="/" replace />;
  const current = useAuthStore.getState().user;
  if (roles && !roles.includes(current.role)) return <Navigate to="/dashboard" replace />;
  if (capability && current.role !== 'SUPER_ADMIN') {
    if (Object.keys(caps).length === 0) return null;
    if (!caps[capability]) return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// Root layout renders the current page plus the global command palette.
function RootLayout() {
  return (
    <>
      <Outlet />
      <CommandPalette />
    </>
  );
}

function createAppRouter() {
  const routes = [
    {
      element: <RootLayout />,
      children: [
        { path: '/', element: <Login /> },
        { path: '/auth/callback', element: <AuthCallback /> },
        { path: '/tenant-register', element: <Protected roles={['SUPER_ADMIN']}><TenantRegister /></Protected> },
        { path: '/platform', element: <Protected roles={['SUPER_ADMIN']}><SuperAdminDashboard /></Protected> },
        { path: '/platform/tenants', element: <Protected roles={['SUPER_ADMIN']}><Tenants /></Protected> },
        { path: '/platform/tenants/:id', element: <Protected roles={['SUPER_ADMIN']}><TenantDetail /></Protected> },
        { path: '/platform/database', element: <Protected roles={['SUPER_ADMIN']}><DatabaseTools /></Protected> },
        { path: '/dashboard', element: <Protected><UserDashboard /></Protected> },
        { path: '/employees', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN']}><Employees /></Protected> },
        { path: '/organization', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN']}><Organization /></Protected> },
        { path: '/payroll', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'SUPER_ADMIN']} capability="payrollRead"><Payroll /></Protected> },
        { path: '/leave', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN']} capability="leaveApproval"><Leave /></Protected> },
        { path: '/audit', element: <Protected roles={['ADMIN', 'AUDITOR', 'SUPER_ADMIN']}><Audit /></Protected> },
        { path: '/reports', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'AUDITOR', 'SUPER_ADMIN']}><Reports /></Protected> },
        { path: '/users', element: <Protected roles={['ADMIN', 'SUPER_ADMIN']} capability="manageUsersAndRoles"><Users /></Protected> },
        { path: '/attendance', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN']}><Attendance /></Protected> },
        { path: '/attendance-portal', element: <Protected roles={['EMPLOYEE', 'ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN']}><AttendancePortal /></Protected> },
        { path: '/biometric-devices', element: <Protected roles={['ADMIN', 'SUPER_ADMIN']}><Devices /></Protected> },
        { path: '/appointments', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']} capability="appointmentsCRUD"><Appointments /></Protected> },
        { path: '/performance', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN']}><Performance /></Protected> },
        { path: '/plantilla', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']} capability="employeeRecordsCRUD"><Plantilla /></Protected> },
        { path: '/vacancy', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']} capability="recruitmentCRUD"><Navigate to="/recruitment?tab=vacancies" replace /></Protected> },
        { path: '/designation', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']} capability="appointmentsCRUD"><Designation /></Protected> },
        { path: '/learning', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']} capability="trainingCRUD"><Learning /></Protected> },
        { path: '/recruitment', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']} capability="recruitmentCRUD"><Recruitment /></Protected> },
        { path: '/interviews', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']} capability="interviewCRUD"><Navigate to="/recruitment?tab=interviews" replace /></Protected> },
        { path: '/ess', element: <Protected roles={['EMPLOYEE', 'ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD']}><ESS /></Protected> },
        { path: '/ipcr', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN']}><IPCR /></Protected> },
        { path: '/disqualifications', element: <Protected roles={['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']} capability="disqualificationCRUD"><Disqualifications /></Protected> },
        { path: '/settings', element: <Protected><Settings /></Protected> },
        { path: '/help', element: <Protected><Help /></Protected> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ];
  return sentryWrapCreateBrowserRouter(createBrowserRouter)(routes, {
    future: { v7_startTransition: true, v7_relativeSplatPath: true },
  });
}

export default function App() {
  // Router is created once (after initSentry ran in main.jsx) so Sentry wraps
  // the instance for route-level traces. useState lazy init keeps it stable.
  const [router] = React.useState(createAppRouter);
  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  );
}