import { Router } from 'express';
import { appointmentsController } from '../controllers/appointmentsController.js';
import { requireAuth } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();
router.use(requireAuth);

router.get('/', appointmentsController.list);
router.post('/', auditLog, appointmentsController.create);
router.patch('/:id', auditLog, appointmentsController.update);
router.delete('/:id', auditLog, appointmentsController.remove);

export default router;