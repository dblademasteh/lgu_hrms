/**
 * Role metadata + capability helpers.
 *
 * The authoritative permission matrix lives in the BACKEND
 * (backend/src/shared/permissions.js + RolePermission table). The frontend
 * reads effective permissions via `GET /roles/my-permissions` (self) or
 * `GET /roles/permissions` (tenant matrix, manageUsersAndRoles capability).
 * Nothing here is an authorization source of truth.
 */

import { useState, useEffect } from 'react';
import { rolesApi } from '../api/roles.js';

export const ROLE_RANK = {
  EMPLOYEE: 0,
  AUDITOR: 1,
  DEPARTMENT_HEAD: 2,
  PAYROLL_OFFICER: 3,
  HR_MANAGER: 4,
  ADMIN: 5,
  SUPER_ADMIN: 6,
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

export function visibleRoles(minRole) {
  const minRank = ROLE_RANK[minRole] ?? 0;
  return Object.entries(ROLE_RANK)
    .filter(([, rank]) => rank >= minRank)
    .map(([role]) => role);
}

/** Current user's capability map from the backend (empty until loaded). */
export function useUserCapabilities() {
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    let cancelled = false;
    rolesApi.myPermissions()
      .then(res => {
        if (!cancelled) setPermissions(res.data?.permissions ?? {});
      })
      .catch(() => { /* dashboard degrades to role-gated cards */ });
    return () => { cancelled = true; };
  }, []);

  return permissions;
}