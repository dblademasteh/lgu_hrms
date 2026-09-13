import { Router } from 'express';
import { payrollController } from '../controllers/payrollController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { z } from 'zod';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
// Reads are gated by payrollRead (ADMIN / HR_MANAGER / PAYROLL_OFFICER default);
// EMPLOYEE gets their own payslips exclusively via /ess/payslips.
const router = Router();

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
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
  validate({
    body: z.object({
      periodId: z.string().min(1),
      runDate: dateField,
    }),
  }),
  payrollController.createRun
);
router.patch(
  '/runs/:id/approve',
  requirePermission('payrollRuns'),
  validate({ params: idParam }),
  payrollController.approveRun
);
router.post(
  '/runs/:id/generate',
  requirePermission('payrollRuns'),
  validate({ params: idParam }),
  payrollController.generateRun
);
router.post(
  '/runs/:id/post',
  requirePermission('payrollRuns'),
  validate({ params: idParam }),
  payrollController.postRun
);
router.post(
  '/periods',
  requirePermission('payrollRuns'),
  validate({
    body: z.object({
      name: z.string().min(3).max(80),
      startDate: dateField,
      endDate: dateField,
      fiscalYear: z.number().int().min(2000).max(2100),
    }),
  }),
  payrollController.createPeriod
);
router.patch(
  '/periods/:id/close',
  requirePermission('payrollRuns'),
  validate({ params: idParam }),
  payrollController.closePeriod
);
router.get(
  '/payslips/:itemId/print',
  requirePermission('payrollRead'),
  validate({ params: z.object({ itemId: z.string().min(1) }) }),
  payrollController.printPayslip
);

export default router;