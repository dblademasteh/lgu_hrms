// Central mock dataset — shaped like future API responses.
// When wiring the backend, swap these imports for calls in src/api/ (same shapes).

export function badgeTone(status) {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'APPROVED':
    case 'ISSUED':
    case 'EFFECTIVE':
    case 'POSTED':
    case 'ACTIVE':
    case 'SUCCESS':
    case 'HIRED':
    case 'OPEN':
    case 'COMPLETED':
    case 'FILLED':
    case 'PUBLISHED':
      return 'badge-success';
    case 'SCHEDULED':
      return 'badge-info';
    case 'PENDING':
    case 'DRAFT':
    case 'PLANNING':
    case 'MONITORING':
    case 'REVIEW':
      return 'badge-warning';
    case 'REJECTED':
    case 'DENIED':
    case 'CANCELLED':
    case 'ENDED':
    case 'SEPARATED':
    case 'REVOKED':
    case 'DISQUALIFIED':
    case 'CLOSED':
      return 'badge-error';
    default:
      return 'badge-neutral';
  }
}
