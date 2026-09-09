import { Router } from 'express';
import { departmentsController } from '../controllers/departmentsController.js';
import { requireAuth } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();
router.use(requireAuth);

router.get('/', departmentsController.list);
router.post('/', auditLog, departmentsController.create);
router.patch('/:id', auditLog, departmentsController.update);
router.delete('/:id', auditLog, departmentsController.remove);

export default router;