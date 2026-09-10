import { Router } from 'express';
import { appointmentsController } from '../controllers/appointmentsController.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
const router = Router();

router.get('/', appointmentsController.list);
router.post('/', appointmentsController.create);
router.patch('/:id', appointmentsController.update);
router.delete('/:id', appointmentsController.remove);

export default router;