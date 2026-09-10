import { Router } from 'express';
import { departmentsController } from '../controllers/departmentsController.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
const router = Router();

router.get('/', departmentsController.list);
router.post('/', departmentsController.create);
router.patch('/:id', departmentsController.update);
router.delete('/:id', departmentsController.remove);

export default router;