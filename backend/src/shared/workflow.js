/**
 * Document workflow — single source of truth for the DTMS state machine.
 *
 * Backend repositories/services import this directly.
 * Frontend gets the same map via `GET /documents/workflow`.
 */

export const STATUS = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
};

export const WORKFLOW = {
  [STATUS.DRAFT]: [STATUS.PENDING_REVIEW, STATUS.ARCHIVED],
  [STATUS.PENDING_REVIEW]: [STATUS.APPROVED, STATUS.REJECTED],
  [STATUS.APPROVED]: [STATUS.PUBLISHED, STATUS.REJECTED],
  [STATUS.REJECTED]: [STATUS.PENDING_REVIEW, STATUS.ARCHIVED],
  [STATUS.PUBLISHED]: [STATUS.ARCHIVED],
  [STATUS.ARCHIVED]: [],
};

export const TRANSITION_ROLES = {
  [STATUS.PENDING_REVIEW]: null,
  [STATUS.APPROVED]: ['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'],
  [STATUS.REJECTED]: ['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'],
  [STATUS.PUBLISHED]: ['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'],
  [STATUS.ARCHIVED]: ['ADMIN', 'SUPER_ADMIN'],
};

export const AUDIT_FIELDS = {
  [STATUS.APPROVED]: { who: 'approvedBy', when: 'approvedAt' },
  [STATUS.REJECTED]: { who: 'rejectedBy', when: 'rejectedAt' },
  [STATUS.PUBLISHED]: { who: 'publishedBy', when: 'publishedAt' },
  [STATUS.ARCHIVED]: { who: 'archivedBy', when: 'archivedAt' },
};

export const LABEL = {
  [STATUS.DRAFT]: 'Draft',
  [STATUS.PENDING_REVIEW]: 'Pending Review',
  [STATUS.APPROVED]: 'Approved',
  [STATUS.REJECTED]: 'Rejected',
  [STATUS.PUBLISHED]: 'Published',
  [STATUS.ARCHIVED]: 'Archived',
};

export function canTransition(current, next) {
  const allowed = WORKFLOW[current] || [];
  return allowed.includes(next);
}

export function requiredRoleFor(next) {
  return TRANSITION_ROLES[next] || null;
}

export function isTerminal(status) {
  return (WORKFLOW[status] || []).length === 0;
}
