/**
 * Integration catalog — single source of truth for the API-key scopes,
 * webhook events and the per-type setup contract that the Settings →
 * Integrations wizard renders. Served to the UI via
 * `GET /api/v1/integrations/catalog` so the wizard never hardcodes a scope
 * or endpoint the server does not actually enforce.
 */

export const INTEGRATION_SCOPES = [
  {
    scope: 'employees:read',
    label: 'Employee master',
    description: 'Employee records, departments and positions',
    readOnly: true,
  },
  {
    scope: 'attendance:read',
    label: 'Attendance read',
    description: 'Attendance records within a date range',
    readOnly: true,
  },
  {
    scope: 'attendance:ingest',
    label: 'Attendance write',
    description: 'Push single punches and bulk attendance back into HRMS',
    readOnly: false,
  },
  {
    scope: 'leave:read',
    label: 'Leave read',
    description: 'Leave requests and per-employee leave credits',
    readOnly: true,
  },
  {
    scope: 'loans:read',
    label: 'Loans read',
    description: 'Employee loans with amortization schedules, for salary-deduction sync',
    readOnly: true,
  },
  {
    scope: 'payroll:read',
    label: 'Payroll read',
    description: 'Payroll periods, runs, run detail and payslips',
    readOnly: true,
  },
  {
    scope: 'payroll:write',
    label: 'Payroll write',
    description: 'Reserved for future payroll write endpoints',
    readOnly: false,
  },
];

export const SCOPE_NAMES = INTEGRATION_SCOPES.map((s) => s.scope);

export const WEBHOOK_EVENTS = [
  { event: 'employee.created', description: 'Employee record created in HRMS' },
  { event: 'employee.updated', description: 'Employee record changed in HRMS' },
  { event: 'employee.deleted', description: 'Employee record removed in HRMS' },
  { event: 'attendance.created', description: 'Punch or manual attendance row created' },
  { event: 'attendance.updated', description: 'Attendance row closed or edited' },
  { event: 'attendance.bulk_updated', description: 'Bulk attendance ingestion' },
  { event: 'payroll.period.created', description: 'New payroll period opened' },
  { event: 'payroll.period.closed', description: 'Payroll period closed' },
  { event: 'payroll.run.created', description: 'Payroll run created (DRAFT)' },
  { event: 'payroll.run.approved', description: 'Payroll run approved' },
  { event: 'payroll.run.posted', description: 'Payroll run posted — payslips generated' },
];

export const EVENT_NAMES = WEBHOOK_EVENTS.map((e) => e.event);

const COMMON_ENV = [
  { key: 'HRMS_BASE_URL', hint: 'https://hrms.example.gov.ph' },
  { key: 'HRMS_API_KEY', hint: 'The key created in step 3 (shown once)' },
  { key: 'HRMS_TENANT_CODE', hint: 'Tenant code, e.g. default' },
];

export const INTEGRATION_TYPES = [
  {
    type: 'PAYROLL',
    label: 'Payroll',
    blurb: 'An external payroll system pulls employees, attendance, leave and posted payroll results from HRMS.',
    direction: 'HRMS → external (pull)',
    requiredScopes: ['employees:read', 'payroll:read'],
    recommendedScopes: ['attendance:read', 'leave:read', 'loans:read'],
    testPath: '/integrations/payroll/test',
    endpoints: [
      { method: 'GET', path: '/integrations/employees', scope: 'employees:read', note: 'Employee master with salary, statutory numbers and bank details' },
      { method: 'GET', path: '/integrations/departments', scope: 'employees:read', note: 'Department reference data' },
      { method: 'GET', path: '/integrations/attendance', scope: 'attendance:read', note: 'DTR by date range, for worked-hours deductions' },
      { method: 'GET', path: '/integrations/leave/requests', scope: 'leave:read', note: 'Leave with pay / without pay, for LWOP' },
      { method: 'GET', path: '/integrations/leave/credits', scope: 'leave:read', note: 'Per-employee leave balances' },
      { method: 'GET', path: '/integrations/loans', scope: 'loans:read', note: 'Loans with amortization schedules for deduction' },
      { method: 'GET', path: '/integrations/payroll/periods', scope: 'payroll:read', note: 'Payroll periods' },
      { method: 'GET', path: '/integrations/payroll/runs', scope: 'payroll:read', note: 'Payroll runs with net totals' },
      { method: 'GET', path: '/integrations/payroll/runs/:id', scope: 'payroll:read', note: 'Run detail with deduction lines' },
      { method: 'GET', path: '/integrations/payroll/payslips', scope: 'payroll:read', note: 'Payslips for LDDAP and bank export' },
    ],
    envKeys: COMMON_ENV,
    events: ['payroll.period.created', 'payroll.period.closed', 'payroll.run.created', 'payroll.run.approved', 'payroll.run.posted'],
  },
  {
    type: 'ATTENDANCE',
    label: 'Attendance',
    blurb: 'A kiosk, terminal or timeclock pushes punches into HRMS, or HRMS pulls DTR from it.',
    direction: 'Bidirectional (push or pull)',
    requiredScopes: ['attendance:ingest'],
    recommendedScopes: ['attendance:read', 'employees:read'],
    testPath: '/integrations/attendance/test',
    endpoints: [
      { method: 'POST', path: '/integrations/attendance/punch', scope: 'attendance:ingest', note: 'Single punch in/out' },
      { method: 'POST', path: '/integrations/attendance/bulk', scope: 'attendance:ingest', note: 'Bulk attendance, max 1000 rows' },
      { method: 'GET', path: '/integrations/attendance', scope: 'attendance:read', note: 'Read DTR back by date range' },
      { method: 'GET', path: '/integrations/employees', scope: 'employees:read', note: 'Resolve employee numbers for punches' },
    ],
    envKeys: COMMON_ENV,
    events: ['attendance.created', 'attendance.updated', 'attendance.bulk_updated'],
  },
  {
    type: 'LEAVE',
    label: 'Leave',
    blurb: 'An external payroll or HRIS reads leave requests and leave credits to drive deductions.',
    direction: 'HRMS → external (pull)',
    requiredScopes: ['leave:read'],
    recommendedScopes: ['employees:read'],
    testPath: '/integrations/leave/test',
    endpoints: [
      { method: 'GET', path: '/integrations/leave/requests', scope: 'leave:read', note: 'Leave requests by date range, with employee identity' },
      { method: 'GET', path: '/integrations/leave/credits', scope: 'leave:read', note: 'Leave credits per employee and year' },
      { method: 'GET', path: '/integrations/employees', scope: 'employees:read', note: 'Employee master for the leave owner' },
    ],
    envKeys: COMMON_ENV,
    events: [],
  },
];

export const INTEGRATION_TYPE_NAMES = INTEGRATION_TYPES.map((t) => t.type);

export function getIntegrationType(type) {
  return INTEGRATION_TYPES.find((t) => t.type === type) || null;
}

export const EXTERNAL_SYSTEM_TYPES = [...INTEGRATION_TYPE_NAMES, 'HRIS', 'PORTAL', 'OTHER'];
