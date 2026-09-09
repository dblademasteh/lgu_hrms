import { Router } from 'express';
import { payrollController } from '../controllers/payrollController.js';
import { requireAuth } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();
router.use(requireAuth);

router.get('/runs', payrollController.listRuns);
router.post('/runs', auditLog, payrollController.createRun);

export default router;