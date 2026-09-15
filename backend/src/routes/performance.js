import { Router } from 'express';
import { performanceController } from '../controllers/performanceController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
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
router.get('/competencies', performanceController.listCompetencies);
router.post('/competencies', validate(createCompetencySchema), requirePermission('manageUsersAndRoles'), performanceController.createCompetency);
router.get('/competencies/:id', validate(competencyIdSchema), performanceController.getCompetency);
router.patch('/competencies/:id', validate(updateCompetencySchema), requirePermission('manageUsersAndRoles'), performanceController.updateCompetency);
router.delete('/competencies/:id', validate(competencyIdSchema), requireRole('ADMIN'), performanceController.deleteCompetency);

// Performance reviews
router.get('/', performanceController.list);
router.get('/:id', validate(performanceIdSchema), performanceController.get);
router.post('/', validate(createPerformanceSchema), performanceController.create);
router.patch('/:id', validate(updatePerformanceSchema), performanceController.update);
router.delete('/:id', validate(performanceIdSchema), requireRole('ADMIN'), performanceController.remove);

// Rating computation
router.post('/:id/compute', validate(computeRatingSchema), performanceController.compute);

// Review targets
router.get('/:id/targets', validate(performanceIdSchema), performanceController.listTargets);
router.post('/:id/targets', validate(createTargetSchema), performanceController.addTarget);
router.patch('/:id/targets/:targetId', validate(updateTargetSchema), performanceController.updateTarget);
router.delete('/:id/targets/:targetId', validate(targetIdSchema), performanceController.removeTarget);

// Review competencies
router.get('/:id/competencies', validate(performanceIdSchema), performanceController.listReviewCompetencies);
router.post('/:id/competencies', validate(performanceIdSchema), validate(createReviewCompetencySchema), performanceController.addReviewCompetency);
router.patch('/:id/competencies/:itemId', validate(performanceIdSchema), validate(updateReviewCompetencySchema), performanceController.updateReviewCompetency);
router.delete('/:id/competencies/:itemId', validate(performanceIdSchema), requireRole('ADMIN'), performanceController.removeReviewCompetency);

export default router;