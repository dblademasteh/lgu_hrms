import { Router } from 'express';
import { performanceController } from '../controllers/performanceController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import {
  createPerformanceSchema,
  updatePerformanceSchema,
  performanceIdSchema,
  createTargetSchema,
  updateTargetSchema,
  targetIdSchema,
  computeRatingSchema,
  createCompetencySchema,
  updateCompetencySchema,
  competencyIdSchema,
  createReviewCompetencySchema,
  updateReviewCompetencySchema,
} from '../shared/contracts/performance.js';

const router = Router();

// Competency catalog
router.get('/competencies', requirePermission('performanceRead'), performanceController.listCompetencies);
router.post('/competencies', requirePermission('performanceCRUD'), validate(createCompetencySchema), performanceController.createCompetency);
router.get('/competencies/:id', validate(competencyIdSchema), requirePermission('performanceRead'), performanceController.getCompetency);
router.patch('/competencies/:id', requirePermission('performanceCRUD'), validate(updateCompetencySchema), performanceController.updateCompetency);
router.delete('/competencies/:id', requirePermission('performanceCRUD'), validate(competencyIdSchema), performanceController.deleteCompetency);

// Performance reviews
router.get('/', requirePermission('performanceRead'), performanceController.list);
router.get('/:id', validate(performanceIdSchema), requirePermission('performanceRead'), performanceController.get);
router.post('/', requirePermission('performanceCRUD'), validate(createPerformanceSchema), performanceController.create);
router.patch('/:id', requirePermission('performanceCRUD'), validate(updatePerformanceSchema), performanceController.update);
router.delete('/:id', requirePermission('performanceCRUD'), validate(performanceIdSchema), performanceController.remove);

// Rating computation
router.post('/:id/compute', requirePermission('performanceCRUD'), validate(computeRatingSchema), performanceController.compute);

// Review targets
router.get('/:id/targets', validate(performanceIdSchema), requirePermission('performanceRead'), performanceController.listTargets);
router.post('/:id/targets', requirePermission('performanceCRUD'), validate(createTargetSchema), performanceController.addTarget);
router.patch('/:id/targets/:targetId', requirePermission('performanceCRUD'), validate(updateTargetSchema), performanceController.updateTarget);
router.delete('/:id/targets/:targetId', requirePermission('performanceCRUD'), validate(targetIdSchema), performanceController.removeTarget);

// Review competencies
router.get('/:id/competencies', validate(performanceIdSchema), requirePermission('performanceRead'), performanceController.listReviewCompetencies);
router.post('/:id/competencies', requirePermission('performanceCRUD'), validate(performanceIdSchema), validate(createReviewCompetencySchema), performanceController.addReviewCompetency);
router.patch('/:id/competencies/:itemId', requirePermission('performanceCRUD'), validate(performanceIdSchema), validate(updateReviewCompetencySchema), performanceController.updateReviewCompetency);
router.delete('/:id/competencies/:itemId', requirePermission('performanceCRUD'), validate(performanceIdSchema), performanceController.removeReviewCompetency);

export default router;