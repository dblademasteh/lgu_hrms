import { Router } from 'express';
import * as ctrl from '../controllers/payrollDeductionController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { payrollManagedByLguPayroll } from '../middleware/payrollAuthority.js';
import { deductionItemSchema } from '../shared/contracts/payrollDeduction.js';

// NOTE: requireAuth is mounted globally in routes/index.js.
// Reading lines is payrollRead-gated (payroll staff).
// Writes are disabled: payroll figures are mirrored from lgu-payroll, and these
// endpoints appended lines without reconciling the item's deduction/net totals.
const router = Router();
const blocked = payrollManagedByLguPayroll();
router.get('/items/:itemId/lines', requirePermission('payrollRead'), validate(deductionItemSchema), ctrl.getLinesHandler);
router.post('/items/:itemId/lines', requirePermission('payrollRuns'), blocked);
router.post('/items/:itemId/payslip', requirePermission('payrollRuns'), blocked);
export default router;
