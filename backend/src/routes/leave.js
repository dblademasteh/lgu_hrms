import { Router } from 'express';
import { leaveController } from '../controllers/leaveController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { createLeaveRequestSchema, updateLeaveRequestSchema } from '../shared/contracts/leave.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
const router = Router();

router.get('/requests', leaveController.listRequests);
router.post('/requests', validate(createLeaveRequestSchema), leaveController.createRequest);
// Approvals need the leaveApproval capability (defaults: ADMIN, HR_MANAGER, DEPARTMENT_HEAD).
router.patch('/requests/:id', requirePermission('leaveApproval'), validate(updateLeaveRequestSchema), leaveController.updateRequest);
router.get('/credits', leaveController.listCredits);

export default router;