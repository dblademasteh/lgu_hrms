import { Router } from 'express';
import { delegationController } from '../controllers/delegationController.js';
import { requireAuth } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate } from '../middleware/validate.js';
import { delegationSchema } from '../shared/contracts/account.js';

const router = Router();
router.use(requireAuth);

router.get('/', delegationController.list);
router.post('/', validate({ body: delegationSchema.body }), auditLog, delegationController.create);
router.post('/:id/revoke', auditLog, delegationController.revoke);

export default router;
