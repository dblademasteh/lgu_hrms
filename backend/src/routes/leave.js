import { Router } from 'express';
import { leaveController } from '../controllers/leaveController.js';
import { requireAuth } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();
router.use(requireAuth);

router.get('/requests', leaveController.listRequests);
router.post('/requests', auditLog, leaveController.createRequest);
router.patch('/requests/:id', auditLog, leaveController.updateRequest);
router.get('/credits', leaveController.listCredits);

export default router;