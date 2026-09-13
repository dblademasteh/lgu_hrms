import { Router } from 'express';
import { reportsController } from '../controllers/reportsController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { z } from 'zod';

// NOTE: requireAuth is mounted globally in routes/index.js.
// Payroll summaries are compliance-sensitive: reports capability
// (defaults: ADMIN, HR_MANAGER, PAYROLL_OFFICER, AUDITOR).
const router = Router();
router.use(requirePermission('reports'));

const summarySchema = {
  query: z.object({
    runId: z.string().min(1).optional(),
    periodId: z.string().min(1).optional(),
  }),
};

router.get('/payroll-summary', validate(summarySchema), reportsController.payrollSummary);

export default router;
