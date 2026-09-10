import { Router } from 'express';
import * as ctrl from '../controllers/payrollDeductionController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import { addDeductionLinesSchema, upsertPayslipSchema, deductionItemSchema } from '../shared/contracts/payrollDeduction.js';

// NOTE: requireAuth is mounted globally in routes/index.js.
// Reading lines is open to staff; writing lines/payslips is payroll-officer/admin.
const router = Router();
router.get('/items/:itemId/lines', validate(deductionItemSchema), ctrl.getLinesHandler);
router.post('/items/:itemId/lines', requireRole('ADMIN', 'PAYROLL_OFFICER'), validate(addDeductionLinesSchema), ctrl.addLinesHandler);
router.post('/items/:itemId/payslip', requireRole('ADMIN', 'PAYROLL_OFFICER'), validate(upsertPayslipSchema), ctrl.upsertPayslipHandler);
export default router;
