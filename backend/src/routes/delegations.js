import { Router } from 'express';
import { delegationController } from '../controllers/delegationController.js';
import { validate } from '../middleware/validate.js';
import { delegationSchema } from '../shared/contracts/account.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
const router = Router();

router.get('/', delegationController.list);
router.post('/', validate({ body: delegationSchema.body }), delegationController.create);
router.post('/:id/revoke', delegationController.revoke);

export default router;
