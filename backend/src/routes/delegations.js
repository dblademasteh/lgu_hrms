import { Router } from 'express';
import { delegationController } from '../controllers/delegationController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission.js';
import {
  createDelegationSchema,
  revokeDelegationSchema,
  listDelegationsSchema,
} from '../shared/contracts/delegations.js';

const router = Router();

router.use(requireAuth);
router.use(requirePermission('appointmentsCRUD'));

router.get('/', validate(listDelegationsSchema), delegationController.list);
router.post('/', validate(createDelegationSchema), delegationController.create);
router.post('/:id/revoke', validate(revokeDelegationSchema), delegationController.revoke);

export default router;
