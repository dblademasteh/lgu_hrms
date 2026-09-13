/**
 * Single source of truth for role-based permissions.
 *
 * If a role is absent from a key, it is denied.
 * Add new roles/capabilities here first, then consume from UI + docs.
 */

import { useState, useEffect } from 'react';

export const PERMISSIONS = {
  ADMIN: {
    label: 'Admin',
    manageUsersAndRoles: true,
    employeeRecordsCRUD: true,
    payrollRuns: true,
    leaveApproval: true,
    auditTrail: true,
    reports: true,
    ess: true,
    attendancePortal: true,
  },
  HR_MANAGER: {
    label: 'HR Manager',
    manageUsersAndRoles: false,
    employeeRecordsCRUD: true,
    payrollRuns: true,
    leaveApproval: true,
    auditTrail: false,
    reports: true,
    ess: true,
    attendancePortal: true,
  },
  PAYROLL_OFFICER: {
    label: 'Payroll Officer',
    manageUsersAndRoles: false,
    employeeRecordsCRUD: false,
    payrollRuns: true,
    leaveApproval: false,
    auditTrail: false,
    reports: true,
    ess: true,
    attendancePortal: true,
  },
  DEPARTMENT_HEAD: {
    label: 'Department Head',
    manageUsersAndRoles: false,
    employeeRecordsCRUD: true,
    payrollRuns: false,
    leaveApproval: true,
    auditTrail: false,
    reports: false,
    ess: true,
    attendancePortal: true,
  },
  AUDITOR: {
    label: 'Auditor',
    manageUsersAndRoles: false,
    employeeRecordsCRUD: false,
    payrollRuns: false,
    leaveApproval: false,
    auditTrail: true,
    reports: true,
    ess: false,
    attendancePortal: false,
  },
  EMPLOYEE: {
    label: 'Employee',
    manageUsersAndRoles: false,
    employeeRecordsCRUD: false,
    payrollRuns: false,
    leaveApproval: false,
    auditTrail: false,
    reports: false,
    ess: true,
    attendancePortal: true,
  },
};

export const ROLE_RANK = {
  EMPLOYEE: 0,
  AUDITOR: 1,
  DEPARTMENT_HEAD: 2,
  PAYROLL_OFFICER: 3,
  HR_MANAGER: 4,
  ADMIN: 5,
};

export const ROLE_BADGE_TONES = {
  ADMIN: 'bg-error/10 text-error border-error/20',
  HR_MANAGER: 'bg-accent/10 text-accent border-accent/20',
  PAYROLL_OFFICER: 'bg-success/10 text-success border-success/20',
  DEPARTMENT_HEAD: 'bg-warning/10 text-warning border-warning/20',
  AUDITOR: 'bg-bg text-muted border-line',
  EMPLOYEE: 'bg-bg text-ink border-line',
};

export function can(role, ...allowed) {
  return allowed.includes(role);
}

function loadOverrides() {
  try {
    const raw = localStorage.getItem('permissions-overrides');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const merged = {};
    for (const key of Object.keys(PERMISSIONS)) {
      merged[key] = { ...PERMISSIONS[key], ...(parsed[key] || {}) };
    }
    return merged;
  } catch {
    return PERMISSIONS;
  }
}

export function getPermissions() {
  return loadOverrides();
}

export function hasPermission(role, key) {
  return !!getPermissions()[role]?.[key];
}

export function visibleRoles(minRole) {
  const minRank = ROLE_RANK[minRole] ?? 0;
  return Object.entries(ROLE_RANK)
    .filter(([, rank]) => rank >= minRank)
    .map(([role]) => role);
}

export function usePermissions() {
  const [permissions, setPermissions] = useState(getPermissions);

  useEffect(() => {
    const handler = () => setPermissions(getPermissions());
    window.addEventListener('permissions-changed', handler);
    return () => window.removeEventListener('permissions-changed', handler);
  }, []);

  return permissions;
}
