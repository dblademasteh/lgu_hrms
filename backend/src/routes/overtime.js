import { Router } from 'express';
import { overtimeController } from '../controllers/overtimeController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import {
  createOvertimeSchema,
  updateOvertimeSchema,
  approveOvertimeSchema,
  overtimeIdSchema,
  listOvertimeSchema,
} from '../shared/contracts/overtime.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
const router = Router();

// Overtime services are payroll-adjacent; HR/payroll roles manage them,
// other authenticated staff may read (mirrors /attendance posture).
router.get('/', validate(listOvertimeSchema), overtimeController.list);
router.post('/', validate(createOvertimeSchema), requireRole('ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER'), overtimeController.create);
router.get('/:id/estimate', validate(overtimeIdSchema), overtimeController.estimate);
router.patch('/:id', validate(updateOvertimeSchema), requireRole('ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER'), overtimeController.update);
router.patch('/:id/approve', validate(approveOvertimeSchema), requireRole('ADMIN', 'HR_MANAGER'), overtimeController.approve);
router.delete('/:id', validate(overtimeIdSchema), requireRole('ADMIN', 'HR_MANAGER'), overtimeController.remove);

export default router;