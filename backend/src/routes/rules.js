import { Router } from 'express';
import * as ctrl from '../controllers/rulesController.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { payrollManagedByLguPayroll } from '../middleware/payrollAuthority.js';
import { createLeaveRuleConfigSchema } from '../shared/contracts/rules.js';

// NOTE: requireAuth is mounted globally in routes/index.js.
// Contribution/tax rules were inputs to the local payroll engine only. That engine
// is no longer reachable (see routes/payroll.js), so editing them here would change
// nothing while looking authoritative — the equivalent data lives in lgu-payroll's
// deduction catalogue. Reads stay available for reference.
// Leave-rule config is NOT payroll math: it drives leave accrual in leaveService.
const router = Router();
const blocked = payrollManagedByLguPayroll();
router.get('/contributions', ctrl.listContributionRulesHandler);
router.post('/contributions', blocked);
router.get('/tax-brackets', ctrl.listTaxBracketsHandler);
router.post('/tax-brackets', blocked);
router.get('/leave-rules', ctrl.listLeaveRuleConfigsHandler);
router.post('/leave-rules', requireRole('ADMIN', 'HR_MANAGER'), validate(createLeaveRuleConfigSchema), ctrl.createLeaveRuleConfigHandler);
export default router;