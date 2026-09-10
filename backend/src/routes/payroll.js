import { Router } from 'express';
import { payrollController } from '../controllers/payrollController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import { z } from 'zod';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
const router = Router();

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

router.get('/runs', payrollController.listRuns);
router.get('/periods', payrollController.listPeriods);
router.get(
  '/runs/:id',
  validate({ params: z.object({ id: z.string().min(1) }) }),
  payrollController.getRun
);
router.post(
  '/runs',
  requireRole('ADMIN', 'PAYROLL_OFFICER'),
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
  requireRole('ADMIN', 'PAYROLL_OFFICER'),
  validate({ params: z.object({ id: z.string().min(1) }) }),
  payrollController.approveRun
);

export default router;