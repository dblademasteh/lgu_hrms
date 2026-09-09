import { Router } from 'express';
import { auditController } from '../controllers/auditController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.get('/', auditController.list);

export default router;