/**
 * Single source of truth for role capabilities (permission matrix).
 *
 * Capabilities are enforced server-side via `requirePermission(...keys)`
 * (`backend/src/middleware/permission.js`) on the routes listed in each key's
 * comment. Effective permissions come from the `RolePermission` table; roles
 * with no rows fall back to `DEFAULT_PERMISSIONS` below (so brand-new tenants
 * behave like the historical role whitelist). Editing the matrix changes real
 * authorization, including for custom (non-system) roles.
 */

export const CAPABILITIES = [
  { key: 'manageUsersAndRoles', label: 'Manage users & roles' },
  { key: 'employeeRecordsCRUD', label: 'Employee records (all access)' },
  { key: 'payrollRuns', label: 'Create / generate / approve / post payroll' },
  { key: 'payrollRead', label: 'Read payroll runs, items & payslips' },
  { key: 'leaveApproval', label: 'Approve leave (dept scope)' },
  { key: 'auditTrail', label: 'View audit trail' },
  { key: 'reports', label: 'Generate reports' },
  { key: 'ess', label: 'ESS self-service' },
  { key: 'attendancePortal', label: 'Attendance portal (biometric)' },
];

/** route mapping (documentation only) */
export const CAPABILITY_ROUTES = {
  manageUsersAndRoles: ['/users', '/roles'],
  employeeRecordsCRUD: ['/employees', '/employees/:id/sections'],
  payrollRuns: ['/payroll/runs POST|approve|generate|post', '/payroll/periods POST|close', '/payroll-deduction writes'],
  payrollRead: ['/payroll GETs', '/payroll-deduction GET lines', 'payslip print HTML'],
  leaveApproval: ['/leave PATCH'],
  auditTrail: ['/audit'],
  reports: ['/reports'],
  ess: ['/ess (frontend-gated, self-service)'],
  attendancePortal: ['/attendance-portal (frontend-gated, self-service)'],
};

/**
 * Defaults must mirror the historical backend role whitelist (the effective
 * authorization before the matrix existed). These are seed values; admins can
 * edit them. A role absent here denies everything (fail closed).
 */
export const DEFAULT_PERMISSIONS = {
  ADMIN: {
    manageUsersAndRoles: true,
    employeeRecordsCRUD: true,
    payrollRuns: true,
    payrollRead: true,
    leaveApproval: true,
    auditTrail: true,
    reports: true,
    ess: true,
    attendancePortal: true,
  },
  HR_MANAGER: {
    manageUsersAndRoles: false,
    employeeRecordsCRUD: true,
    payrollRuns: false, // /payroll/runs POST|approve is ADMIN+PAYROLL_OFFICER only
    payrollRead: true,
    leaveApproval: true,
    auditTrail: false,
    reports: true,
    ess: true,
    attendancePortal: true,
  },
  PAYROLL_OFFICER: {
    manageUsersAndRoles: false,
    employeeRecordsCRUD: false,
    payrollRuns: true,
    payrollRead: true,
    leaveApproval: false,
    auditTrail: false,
    reports: true,
    ess: true,
    attendancePortal: true,
  },
  DEPARTMENT_HEAD: {
    manageUsersAndRoles: false,
    employeeRecordsCRUD: true,
    payrollRuns: false,
    payrollRead: false,
    leaveApproval: true,
    auditTrail: false,
    reports: false,
    ess: true,
    attendancePortal: true,
  },
  AUDITOR: {
    manageUsersAndRoles: false,
    employeeRecordsCRUD: false,
    payrollRuns: false,
    payrollRead: false,
    leaveApproval: false,
    auditTrail: true,
    reports: true,
    ess: false,
    attendancePortal: false,
  },
  EMPLOYEE: {
    manageUsersAndRoles: false,
    employeeRecordsCRUD: false,
    payrollRuns: false,
    payrollRead: false, // payslips via /ess/payslips (employee-scoped)
    leaveApproval: false,
    auditTrail: false,
    reports: false,
    ess: true,
    attendancePortal: true,
  },
};