import { Router } from 'express';
import * as ctrl from '../controllers/bonusController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import { createBonusSchema, updateBonusSchema, bonusIdSchema } from '../shared/contracts/bonus.js';

// NOTE: requireAuth is mounted globally in routes/index.js.
// Bonus grants are payroll-officer/admin actions.
const router = Router();
router.use(requireRole('ADMIN', 'PAYROLL_OFFICER', 'HR_MANAGER'));
router.get('/', ctrl.listBonusesHandler);
router.post('/', validate(createBonusSchema), ctrl.createBonusHandler);
router.patch('/:id', validate(updateBonusSchema), ctrl.updateBonusHandler);
export default router;
