import { Router } from 'express';
import { usersController } from '../controllers/usersController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { createUserSchema, updateUserSchema, userIdSchema } from '../shared/contracts/users.js';

const router = Router();

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
// User administration requires the manageUsersAndRoles capability (matrix).
router.use(requirePermission('manageUsersAndRoles'));

router.get('/', usersController.list);
router.post('/', validate(createUserSchema), usersController.create);
router.patch('/:id', validate(updateUserSchema), usersController.update);
router.delete('/:id', validate(userIdSchema), usersController.remove);

export default router;