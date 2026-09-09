import { Router } from 'express';
import { attendanceController } from '../controllers/attendanceController.js';
import { requireAuth } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();
router.use(requireAuth);

router.get('/', attendanceController.list);
router.post('/', auditLog, attendanceController.create);

export default router;