import { Router } from 'express';
import { usersController } from '../controllers/usersController.js';
import { requireAuth } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate } from '../middleware/validate.js';
import { createUserSchema, updateUserSchema, userIdSchema } from '../shared/contracts/users.js';

const router = Router();

router.use(requireAuth);

router.get('/', usersController.list);
router.post('/', auditLog, validate(createUserSchema), usersController.create);
router.patch('/:id', auditLog, validate(updateUserSchema), usersController.update);
router.delete('/:id', auditLog, validate(userIdSchema), usersController.remove);

export default router;