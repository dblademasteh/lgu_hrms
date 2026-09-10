import { Router } from 'express';
import * as ctrl from '../controllers/rulesController.js';
import { requireRole } from '../middleware/rbac.js';

// NOTE: requireAuth is mounted globally in routes/index.js.
// Contribution/tax/leave rules drive payroll math: reads are staff-wide,
// writes are ADMIN + HR_MANAGER only.
const router = Router();
router.get('/contributions', ctrl.listContributionRulesHandler);
router.post('/contributions', requireRole('ADMIN', 'HR_MANAGER'), ctrl.createContributionRuleHandler);
router.get('/tax-brackets', ctrl.listTaxBracketsHandler);
router.post('/tax-brackets', requireRole('ADMIN', 'HR_MANAGER'), ctrl.createTaxBracketHandler);
router.get('/leave-rules', ctrl.listLeaveRuleConfigsHandler);
router.post('/leave-rules', requireRole('ADMIN', 'HR_MANAGER'), ctrl.createLeaveRuleConfigHandler);
export default router;
