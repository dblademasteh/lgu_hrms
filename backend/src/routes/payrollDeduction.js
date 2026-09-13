import { Router } from 'express';
import * as ctrl from '../controllers/payrollDeductionController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { addDeductionLinesSchema, upsertPayslipSchema, deductionItemSchema } from '../shared/contracts/payrollDeduction.js';

// NOTE: requireAuth is mounted globally in routes/index.js.
// Reading lines is payrollRead-gated (payroll staff); writing lines/payslips needs payrollRuns capability.
const router = Router();
router.get('/items/:itemId/lines', requirePermission('payrollRead'), validate(deductionItemSchema), ctrl.getLinesHandler);
router.post('/items/:itemId/lines', requirePermission('payrollRuns'), validate(addDeductionLinesSchema), ctrl.addLinesHandler);
router.post('/items/:itemId/payslip', requirePermission('payrollRuns'), validate(upsertPayslipSchema), ctrl.upsertPayslipHandler);
export default router;
