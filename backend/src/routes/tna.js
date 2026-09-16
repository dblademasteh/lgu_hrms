import { Router } from 'express';
import { listTnasHandler, getTnaHandler, createTnaHandler, updateTnaHandler, deleteTnaHandler } from '../controllers/tnaController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { createTnaSchema, updateTnaSchema, tnaIdSchema, listTnaSchema } from '../shared/contracts/tna.js';

const router = Router();

router.use(requirePermission('trainingCRUD'));

router.get('/', validate(listTnaSchema), listTnasHandler);
router.get('/:id', validate(tnaIdSchema), getTnaHandler);
router.post('/', validate(createTnaSchema), createTnaHandler);
router.patch('/:id', validate(updateTnaSchema), updateTnaHandler);
router.delete('/:id', validate(tnaIdSchema), deleteTnaHandler);

export default router;
