import { Router } from 'express';
import * as ctrl from '../controllers/trainingController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import {
  listProgramsSchema,
  getProgramSchema,
  createProgramSchema,
  updateProgramSchema,
  deleteProgramSchema,
  listEnrollmentsSchema,
  createEnrollmentSchema,
} from '../shared/contracts/training.js';

const router = Router();

router.use(requirePermission('trainingCRUD'));

router.get('/programs', validate(listProgramsSchema), ctrl.listProgramsHandler);
router.get('/programs/:id', validate(getProgramSchema), ctrl.getProgramHandler);
router.post('/programs', validate(createProgramSchema), ctrl.createProgramHandler);
router.patch('/programs/:id', validate(updateProgramSchema), ctrl.updateProgramHandler);
router.delete('/programs/:id', validate(deleteProgramSchema), ctrl.deleteProgramHandler);
router.get('/enrollments', validate(listEnrollmentsSchema), ctrl.listEnrollmentsHandler);
router.post('/enrollments', validate(createEnrollmentSchema), ctrl.createEnrollmentHandler);

export default router;
