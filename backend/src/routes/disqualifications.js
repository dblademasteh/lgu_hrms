import { Router } from 'express';
import { disqualificationController } from '../controllers/disqualificationController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { createDisqualificationSchema, updateDisqualificationSchema, disqualificationIdSchema, disqualificationReportSchema } from '../shared/contracts/disqualification.js';

const router = Router();

router.get('/', requirePermission('disqualificationCRUD'), disqualificationController.list);
router.get('/report', requirePermission('disqualificationCRUD'), validate(disqualificationReportSchema), disqualificationController.getDibarReport);
router.get('/active', requirePermission('disqualificationCRUD'), disqualificationController.getActive);
router.get('/:id', requirePermission('disqualificationCRUD'), validate(disqualificationIdSchema), disqualificationController.getById);
router.post('/', requirePermission('disqualificationCRUD'), validate(createDisqualificationSchema), disqualificationController.create);
router.patch('/:id', requirePermission('disqualificationCRUD'), validate(updateDisqualificationSchema), disqualificationController.update);
router.delete('/:id', requirePermission('disqualificationCRUD'), validate(disqualificationIdSchema), disqualificationController.delete);

export default router;
