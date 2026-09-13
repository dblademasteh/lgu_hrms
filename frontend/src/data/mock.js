// Central mock dataset — shaped like future API responses.
// When wiring the backend, swap these imports for calls in src/api/ (same shapes).

export const departments = [
  { code: 'PGO', name: "Governor's Office", parent: null, head: 'EMP-001' },
  { code: 'HR', name: 'Human Resource Office', parent: 'PGO', head: 'EMP-004' },
  { code: 'ACC', name: 'Accounting Office', parent: 'PGO', head: 'EMP-011' },
  { code: 'TRE', name: 'Treasury Office', parent: 'PGO', head: 'EMP-014' },
  { code: 'ENG', name: 'Engineering Office', parent: 'PGO', head: 'EMP-021' },
  { code: 'HEA', name: 'Health Services Office', parent: 'PGO', head: 'EMP-030' },
];

export const employees = [
  { id: 1, no: 'EMP-001', name: 'Juan Dela Cruz', position: 'Department Head', dept: 'HR', status: 'Active', hired: '2015-06-01', sg: 'SG-24' },
  { id: 2, no: 'EMP-042', name: 'Maria Santos', position: 'HR Assistant', dept: 'HR', status: 'Active', hired: '2019-02-11', sg: 'SG-11' },
  { id: 3, no: 'EMP-015', name: 'Pedro Reyes', position: 'Accountant II', dept: 'ACC', status: 'On Leave', hired: '2017-11-20', sg: 'SG-14' },
  { id: 4, no: 'EMP-004', name: 'Ana Mendoza', position: 'Administrative Aide', dept: 'PGO', status: 'Probationary', hired: '2026-01-05', sg: 'SG-1' },
  { id: 5, no: 'EMP-021', name: 'Carlos Bautista', position: 'Engineer III', dept: 'ENG', status: 'Active', hired: '2013-03-11', sg: 'SG-19' },
  { id: 6, no: 'EMP-030', name: 'Liza Aquino', position: 'Nurse II', dept: 'HEA', status: 'Active', hired: '2018-07-02', sg: 'SG-15' },
  { id: 7, no: 'EMP-014', name: 'Ramon Torres', position: 'Cashier II', dept: 'TRE', status: 'Active', hired: '2020-09-14', sg: 'SG-12' },
  { id: 8, no: 'EMP-055', name: 'Grace Villanueva', position: 'Records Officer', dept: 'PGO', status: 'On Leave', hired: '2021-01-18', sg: 'SG-9' },
];

export const payrollRuns = [
  { id: 'PR-2026-09A', period: 'Sep 1–15, 2026', status: 'Processing', headcount: 1248, net: '₱ 18,420,500' },
  { id: 'PR-2026-08B', period: 'Aug 16–31, 2026', status: 'Approved', headcount: 1241, net: '₱ 18,102,275' },
  { id: 'PR-2026-08A', period: 'Aug 1–15, 2026', status: 'Posted', headcount: 1241, net: '₱ 17,988,400' },
];

export const ledgerEntries = [
  { employee: 'EMP-001 · Dela Cruz', gross: '₱ 96,410.00', deductions: '₱ 12,890.25', net: '₱ 83,519.75', run: 'PR-2026-08B' },
  { employee: 'EMP-042 · Santos', gross: '₱ 31,205.00', deductions: '₱ 4,180.60', net: '₱ 27,024.40', run: 'PR-2026-08B' },
  { employee: 'EMP-021 · Bautista', gross: '₱ 58,940.00', deductions: '₱ 7,902.15', net: '₱ 51,037.85', run: 'PR-2026-08B' },
  { employee: 'EMP-030 · Aquino', gross: '₱ 44,120.00', deductions: '₱ 5,930.40', net: '₱ 38,189.60', run: 'PR-2026-08B' },
];

export const leaveRequests = [
  { id: 1, no: 'EMP-042', name: 'Maria Santos', type: 'Vacation Leave', from: '2026-09-14', to: '2026-09-18', days: 5, status: 'Pending' },
  { id: 2, no: 'EMP-015', name: 'Pedro Reyes', type: 'Sick Leave', from: '2026-09-07', to: '2026-09-08', days: 2, status: 'Approved' },
  { id: 3, no: 'EMP-055', name: 'Grace Villanueva', type: 'Solo Parent Leave', from: '2026-09-01', to: '2026-09-05', days: 5, status: 'Approved' },
  { id: 4, no: 'EMP-004', name: 'Ana Mendoza', type: 'Special Leave', from: '2026-09-21', to: '2026-09-22', days: 2, status: 'Pending' },
  { id: 5, no: 'EMP-014', name: 'Ramon Torres', type: 'Compensatory Leave', from: '2026-08-28', to: '2026-08-28', days: 1, status: 'Denied' },
];

export const auditLogs = [
  { ts: '2026-09-08 16:42:11', user: 'jdelacruz', action: 'Payroll Approved', entity: 'PR-2026-08B', ip: '10.20.1.15' },
  { ts: '2026-09-07 09:15:03', user: 'msantos', action: 'Leave Submitted', entity: 'LV-0091', ip: '10.20.3.22' },
  { ts: '2026-09-07 08:51:47', user: 'preyes', action: 'Profile Updated', entity: 'EMP-015', ip: '10.20.2.8' },
  { ts: '2026-09-06 14:03:29', user: 'amendoza', action: 'Overtime Filed', entity: 'OT-0233', ip: '10.20.1.31' },
  { ts: '2026-09-06 11:27:05', user: 'admin', action: 'User Created', entity: 'USR-0018', ip: '10.20.1.2' },
  { ts: '2026-09-05 17:44:52', user: 'lbautista', action: 'DTR Certified', entity: 'EMP-021', ip: '10.20.4.19' },
];

export const reports = [
  { id: 1, type: 'PDF', title: 'COA Payroll Register', desc: 'Government accounting format payroll register per period.' },
  { id: 2, type: 'PDF', title: 'Payroll Journal', desc: 'Debit/credit journal entries derived from the payroll ledger.' },
  { id: 3, type: 'XLSX', title: 'Employee Master List', desc: 'Full personnel directory with employment history.' },
  { id: 4, type: 'PDF', title: 'Service Record', desc: 'Individual employee service record, CSC format.' },
];

/** Semantic badge tone for a status/action string. */
export function badgeTone(label) {
  if (/approved|active|posted|verified/i.test(label)) return 'badge-success';
  if (/pending|processing|submitted|on leave|expiring|draft/i.test(label)) return 'badge-accent';
  if (/denied|rejected|failed|overdue|inactive/i.test(label)) return 'badge-error';
  if (/probationary|overtime|tardiness|warning/i.test(label)) return 'badge-warning';
  return '';
}

export const users = [
  { id: 1, username: 'admin', role: 'ADMIN', department: null, status: 'Active' },
  { id: 2, username: 'jdelacruz', role: 'HR_MANAGER', department: 'HR', status: 'Active' },
  { id: 3, username: 'mtorres', role: 'PAYROLL_OFFICER', department: 'TRE', status: 'Active' },
  { id: 4, username: 'cbautista', role: 'DEPARTMENT_HEAD', department: 'ENG', status: 'Active' },
  { id: 5, username: 'raquino', role: 'AUDITOR', department: 'ACC', status: 'Inactive' },
  { id: 6, username: 'r.villanueva', role: 'EMPLOYEE', department: 'PGO', status: 'Active' },
];

export const roleMatrix = [
  { capability: 'Manage users & roles', ADMIN: true, HR_MANAGER: false, PAYROLL_OFFICER: false, DEPARTMENT_HEAD: false, AUDITOR: false, EMPLOYEE: false },
  { capability: 'Employee records CRUD', ADMIN: true, HR_MANAGER: true, PAYROLL_OFFICER: false, DEPARTMENT_HEAD: false, AUDITOR: false, EMPLOYEE: false },
  { capability: 'Create / approve payroll runs', ADMIN: true, HR_MANAGER: false, PAYROLL_OFFICER: true, DEPARTMENT_HEAD: false, AUDITOR: false, EMPLOYEE: false },
  { capability: 'Approve leave (dept scope)', ADMIN: true, HR_MANAGER: true, PAYROLL_OFFICER: false, DEPARTMENT_HEAD: true, AUDITOR: false, EMPLOYEE: false },
  { capability: 'View audit trail', ADMIN: true, HR_MANAGER: false, PAYROLL_OFFICER: false, DEPARTMENT_HEAD: false, AUDITOR: true, EMPLOYEE: false },
  { capability: 'Generate COA reports', ADMIN: true, HR_MANAGER: true, PAYROLL_OFFICER: true, DEPARTMENT_HEAD: false, AUDITOR: true, EMPLOYEE: false },
  { capability: 'ESS: view own profile', ADMIN: true, HR_MANAGER: true, PAYROLL_OFFICER: true, DEPARTMENT_HEAD: true, AUDITOR: true, EMPLOYEE: true },
  { capability: 'ESS: file leave requests', ADMIN: true, HR_MANAGER: true, PAYROLL_OFFICER: true, DEPARTMENT_HEAD: true, AUDITOR: true, EMPLOYEE: true },
  { capability: 'ESS: view own attendance', ADMIN: true, HR_MANAGER: true, PAYROLL_OFFICER: true, DEPARTMENT_HEAD: true, AUDITOR: true, EMPLOYEE: true },
  { capability: 'ESS: view own payslips', ADMIN: true, HR_MANAGER: true, PAYROLL_OFFICER: true, DEPARTMENT_HEAD: true, AUDITOR: true, EMPLOYEE: true },
];

export const leaveCredits = [
  { no: 'EMP-001', vacation: 15, sick: 15, special: 5 },
  { no: 'EMP-042', vacation: 12.5, sick: 10, special: 3 },
  { no: 'EMP-015', vacation: 7, sick: 5, special: 0 },
  { no: 'EMP-004', vacation: 15, sick: 15, special: 5 },
  { no: 'EMP-021', vacation: 13, sick: 11, special: 4 },
  { no: 'EMP-030', vacation: 14, sick: 9, special: 3 },
  { no: 'EMP-014', vacation: 11, sick: 12, special: 4 },
  { no: 'EMP-055', vacation: 9.5, sick: 8, special: 2 },
];

export const attendance = [
  { no: 'EMP-001', name: 'Juan Dela Cruz', date: '2026-09-08', in: '07:52', out: '17:05', hours: 8.0, remark: 'On time' },
  { no: 'EMP-042', name: 'Maria Santos', date: '2026-09-08', in: '07:58', out: '17:02', hours: 8.0, remark: 'On time' },
  { no: 'EMP-015', name: 'Pedro Reyes', date: '2026-09-08', in: '—', out: '—', hours: 0, remark: 'On leave' },
  { no: 'EMP-004', name: 'Ana Mendoza', date: '2026-09-08', in: '08:41', out: '17:00', hours: 7.5, remark: 'Tardiness' },
  { no: 'EMP-021', name: 'Carlos Bautista', date: '2026-09-08', in: '08:24', out: '19:10', hours: 9.5, remark: 'Overtime' },
  { no: 'EMP-030', name: 'Liza Aquino', date: '2026-09-08', in: '07:55', out: '17:03', hours: 8.0, remark: 'On time' },
  { no: 'EMP-014', name: 'Ramon Torres', date: '2026-09-08', in: '07:49', out: '16:58', hours: 8.0, remark: 'On time' },
  { no: 'EMP-055', name: 'Grace Villanueva', date: '2026-09-08', in: '—', out: '—', hours: 0, remark: 'On leave' },
];

export const appointments = [
  { no: 'EMP-001', name: 'Juan Dela Cruz', position: 'Department Head', dept: 'HR', type: 'Permanent', itemNo: 'HRMO-II-7', start: '2015-06-01', status: 'Active' },
  { no: 'EMP-021', name: 'Carlos Bautista', position: 'Engineer III', dept: 'ENG', type: 'Permanent', itemNo: 'ENG-III-12', start: '2013-03-11', status: 'Active' },
  { no: 'EMP-030', name: 'Liza Aquino', position: 'Nurse II', dept: 'HEA', type: 'Permanent', itemNo: 'NURSE-II-21', start: '2018-07-02', status: 'Active' },
  { no: 'EMP-004', name: 'Ana Mendoza', position: 'Administrative Aide', dept: 'PGO', type: 'Contractual', itemNo: 'CA-2026-004', start: '2026-01-05', status: 'Active' },
  { no: 'EMP-055', name: 'Grace Villanueva', position: 'Records Officer', dept: 'PGO', type: 'Temporary', itemNo: 'TEMP-2025-018', start: '2025-07-01', status: 'Expiring' },
];

export const deductionLines = [
  { label: 'GSIS Personal Share', amount: 4620.0 },
  { label: 'PhilHealth Contribution', amount: 1250.0 },
  { label: 'Pag-IBIG Contribution', amount: 100.0 },
  { label: 'BIR Withholding Tax', amount: 6420.25 },
  { label: 'Pag-IBIG MPL (Loan)', amount: 500.0 },
];

export const notifications = [
  { id: 1, title: 'Leave request pending', body: 'Maria Santos filed VL Sep 14–18.', time: '2h ago', unread: true },
  { id: 2, title: 'Payroll run ready for review', body: 'PR-2026-09A computed 1,248 items.', time: '5h ago', unread: true },
  { id: 3, title: 'Appointment expiring', body: 'Grace Villanueva (Temporary) — review renewal.', time: '1d ago', unread: false },
];

export const auditDetails = {
  '2026-09-08 16:42:11': { before: { status: 'APPROVED' }, after: { status: 'POSTED', postedBy: 'jdelacruz' } },
  '2026-09-07 08:51:47': { before: { email: 'p.reyes@lgu.gov.ph' }, after: { email: 'pedro.reyes@lgu.gov.ph' } },
  '2026-09-06 11:27:05': { before: null, after: { username: 'amendoza', role: 'DEPARTMENT_HEAD', department: 'ENG' } },
};

export const employmentHistory = [
  { no: 'EMP-001', position: 'HR Assistant', dept: 'HR', from: '2010-07-01', to: '2015-05-31' },
  { no: 'EMP-001', position: 'HR Officer III', dept: 'HR', from: '2015-06-01', to: null },
  { no: 'EMP-042', position: 'Clerk II', dept: 'ACC', from: '2019-02-11', to: '2022-03-31' },
  { no: 'EMP-042', position: 'HR Assistant', dept: 'HR', from: '2022-04-01', to: null },
  { no: 'EMP-021', position: 'Engineer II', dept: 'ENG', from: '2013-03-11', to: '2019-12-31' },
  { no: 'EMP-021', position: 'Engineer III', dept: 'ENG', from: '2020-01-01', to: null },
];