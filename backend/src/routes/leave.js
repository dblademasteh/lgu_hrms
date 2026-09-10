import { Router } from 'express';
import { leaveController } from '../controllers/leaveController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import { createLeaveRequestSchema, updateLeaveRequestSchema } from '../shared/contracts/leave.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
const router = Router();

router.get('/requests', leaveController.listRequests);
router.post('/requests', validate(createLeaveRequestSchema), leaveController.createRequest);
// Approvals are HR/admin/department-head actions.
router.patch('/requests/:id', requireRole('ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD'), validate(updateLeaveRequestSchema), leaveController.updateRequest);
router.get('/credits', leaveController.listCredits);

export default router;