import { Router } from 'express';
import { listAwardsHandler, getAwardHandler, createAwardHandler, updateAwardHandler, deleteAwardHandler } from '../controllers/awardController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { createAwardSchema, updateAwardSchema, awardIdSchema, listAwardsSchema } from '../shared/contracts/awards.js';

const router = Router();

router.use(requirePermission('performanceCRUD'));

router.get('/', validate(listAwardsSchema), listAwardsHandler);
router.get('/:id', validate(awardIdSchema), getAwardHandler);
router.post('/', validate(createAwardSchema), createAwardHandler);
router.patch('/:id', validate(updateAwardSchema), updateAwardHandler);
router.delete('/:id', validate(awardIdSchema), deleteAwardHandler);

export default router;
