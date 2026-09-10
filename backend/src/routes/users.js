import { Router } from 'express';
import { usersController } from '../controllers/usersController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import { createUserSchema, updateUserSchema, userIdSchema } from '../shared/contracts/users.js';

const router = Router();

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
// User admin is ADMIN-only; validate before audit so 400s aren't logged as mutations.
router.use(requireRole('ADMIN'));

router.get('/', usersController.list);
router.post('/', validate(createUserSchema), usersController.create);
router.patch('/:id', validate(updateUserSchema), usersController.update);
router.delete('/:id', validate(userIdSchema), usersController.remove);

export default router;