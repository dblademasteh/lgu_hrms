import { Router } from 'express';
import { payrollController } from '../controllers/payrollController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { payrollManagedByLguPayroll } from '../middleware/payrollAuthority.js';
import { z } from 'zod';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
// Reads are gated by payrollRead (ADMIN / HR_MANAGER / PAYROLL_OFFICER default);
// EMPLOYEE gets their own payslips exclusively via /ess/payslips.
//
// Local payroll writes are disabled: lgu-payroll is the system of record and
// HRMS mirrors it read-only via POST /payroll/sync-from-payroll.
const router = Router();

const blocked = payrollManagedByLguPayroll();

const idParam = z.object({ id: z.string().min(1) });
const runsQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  summary: z.coerce.boolean().default(false),
});

router.get(
  '/runs',
  requirePermission('payrollRead'),
  validate({ query: runsQuery }),
  payrollController.listRuns
);
router.get('/periods', requirePermission('payrollRead'), payrollController.listPeriods);
router.get(
  '/runs/:id',
  requirePermission('payrollRead'),
  validate({ params: idParam }),
  payrollController.getRun
);
router.post(
  '/runs',
  requirePermission('payrollRuns'),
  blocked
);
router.patch(
  '/runs/:id/approve',
  requirePermission('payrollRuns'),
  blocked
);
router.post(
  '/runs/:id/generate',
  requirePermission('payrollRuns'),
  blocked
);
router.post(
  '/runs/:id/post',
  requirePermission('payrollRuns'),
  blocked
);
router.post(
  '/periods',
  requirePermission('payrollRuns'),
  blocked
);
router.patch(
  '/periods/:id/close',
  requirePermission('payrollRuns'),
  blocked
);
// Payroll artifacts (LDDAP bank export, payslip documents) are produced by
// lgu-payroll, the system of record. HRMS only displays the mirrored figures.

// Sync payroll data from lgu-payroll (POST { since: ISO8601 | null })
router.post(
  '/sync-from-payroll',
  requirePermission('payrollRuns'),
  validate({
    body: z.object({
      since: z.string().datetime().optional(),
    }),
  }),
  payrollController.syncFromPayroll
);

export default router;