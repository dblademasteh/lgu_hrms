import { AppError } from '../lib/errors.js';

// lgu-payroll is the system of record for payroll. HRMS only mirrors it via
// payrollAdapter. Any local write to a mirrored run risks overwriting
// authoritative figures with locally recomputed ones, so these paths are
// refused rather than deprecated.
export function payrollManagedByLguPayroll() {
  return (req, res, next) => {
    next(
      new AppError(
        'Payroll is managed by lgu-payroll and mirrored here read-only. Make changes in lgu-payroll, then sync.',
        409,
        'PAYROLL_MANAGED_BY_LGU_PAYROLL'
      )
    );
  };
}
