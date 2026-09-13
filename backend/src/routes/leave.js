import { Router } from 'express';
import { leaveController } from '../controllers/leaveController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { z } from 'zod';
import { createLeaveRequestSchema, updateLeaveRequestSchema, monetizeLeaveSchema } from '../shared/contracts/leave.js';

const router = Router();
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const idParam = z.object({ id: z.string().min(1) });

router.get('/requests', requirePermission('leaveApproval'), leaveController.listRequests);
router.post('/requests', validate(createLeaveRequestSchema), leaveController.createRequest);
router.patch('/requests/:id', requirePermission('leaveApproval'), validate(updateLeaveRequestSchema), leaveController.updateRequest);
router.get('/credits', requirePermission('leaveApproval'), validate({ query: z.object({ employeeId: z.string().min(1) }) }), leaveController.listCredits);
router.post('/requests/:id/monetize', requirePermission('leaveApproval'), validate(monetizeLeaveSchema), leaveController.monetize);
router.post('/credits/reconcile', requirePermission('leaveApproval'), validate({ body: z.object({ employeeId: z.string().min(1) }) }), leaveController.reconcile);

export default router;
