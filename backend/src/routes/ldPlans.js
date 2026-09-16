import { Router } from 'express';
import { listLdPlansHandler, getLdPlanHandler, createLdPlanHandler, updateLdPlanHandler, deleteLdPlanHandler } from '../controllers/ldPlanController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { createLdPlanSchema, updateLdPlanSchema, ldPlanIdSchema, listLdPlansSchema } from '../shared/contracts/ldPlans.js';

const router = Router();

router.use(requirePermission('trainingCRUD'));

router.get('/', validate(listLdPlansSchema), listLdPlansHandler);
router.get('/:id', validate(ldPlanIdSchema), getLdPlanHandler);
router.post('/', validate(createLdPlanSchema), createLdPlanHandler);
router.patch('/:id', validate(updateLdPlanSchema), updateLdPlanHandler);
router.delete('/:id', validate(ldPlanIdSchema), deleteLdPlanHandler);

export default router;
