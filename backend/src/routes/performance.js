import { Router } from 'express';
import { performanceController } from '../controllers/performanceController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import {
  createPerformanceSchema,
  updatePerformanceSchema,
  performanceIdSchema,
  createCompetencySchema,
  updateCompetencySchema,
  competencyIdSchema,
  createReviewCompetencySchema,
  updateReviewCompetencySchema,
} from '../shared/contracts/performance.js';

const router = Router();

router.use(requireRole('ADMIN', 'HR_MANAGER'));

// Performance reviews
router.get('/', performanceController.list);
router.get('/:id', validate(performanceIdSchema), performanceController.get);
router.post('/', validate(createPerformanceSchema), performanceController.create);
router.patch('/:id', validate(updatePerformanceSchema), performanceController.update);
router.delete('/:id', validate(performanceIdSchema), requireRole('ADMIN'), performanceController.remove);

// Competency catalog
router.get('/competencies', performanceController.listCompetencies);
router.post('/competencies', validate(createCompetencySchema), performanceController.createCompetency);
router.get('/competencies/:id', validate(competencyIdSchema), performanceController.getCompetency);
router.patch('/competencies/:id', validate(updateCompetencySchema), performanceController.updateCompetency);
router.delete('/competencies/:id', validate(competencyIdSchema), requireRole('ADMIN'), performanceController.deleteCompetency);

// Review competencies (matrix items)
router.get('/:id/competencies', validate(performanceIdSchema), performanceController.listReviewCompetencies);
router.post('/:id/competencies', validate(performanceIdSchema), validate(createReviewCompetencySchema), performanceController.addReviewCompetency);
router.patch('/:id/competencies/:itemId', validate(performanceIdSchema), validate(updateReviewCompetencySchema), performanceController.updateReviewCompetency);
router.delete('/:id/competencies/:itemId', validate(performanceIdSchema), requireRole('ADMIN'), performanceController.removeReviewCompetency);

export default router;
