import { Router } from 'express';
import { reportsController } from '../controllers/reportsController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import { z } from 'zod';

// NOTE: requireAuth is mounted globally in routes/index.js.
// Payroll summaries are compliance-sensitive: ADMIN, HR_MANAGER, PAYROLL_OFFICER, AUDITOR.
const router = Router();
router.use(requireRole('ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'AUDITOR'));

const summarySchema = {
  query: z.object({
    runId: z.string().min(1).optional(),
    periodId: z.string().min(1).optional(),
  }),
};

router.get('/payroll-summary', validate(summarySchema), reportsController.payrollSummary);

export default router;
