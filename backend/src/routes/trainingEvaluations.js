import { Router } from 'express';
import { listTrainingEvaluationsHandler, getTrainingEvaluationHandler, createTrainingEvaluationHandler, updateTrainingEvaluationHandler, deleteTrainingEvaluationHandler } from '../controllers/trainingEvaluationController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { createTrainingEvaluationSchema, updateTrainingEvaluationSchema, trainingEvaluationIdSchema, listTrainingEvaluationsSchema } from '../shared/contracts/trainingEvaluations.js';

const router = Router();

router.use(requirePermission('trainingCRUD'));

router.get('/', validate(listTrainingEvaluationsSchema), listTrainingEvaluationsHandler);
router.get('/:id', validate(trainingEvaluationIdSchema), getTrainingEvaluationHandler);
router.post('/', validate(createTrainingEvaluationSchema), createTrainingEvaluationHandler);
router.patch('/:id', validate(updateTrainingEvaluationSchema), updateTrainingEvaluationHandler);
router.delete('/:id', validate(trainingEvaluationIdSchema), deleteTrainingEvaluationHandler);

export default router;
