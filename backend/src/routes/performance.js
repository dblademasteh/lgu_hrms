import { Router } from 'express';
import {
  listPerformanceReviewsHandler,
  getPerformanceReviewHandler,
  createPerformanceReviewHandler,
  updatePerformanceReviewHandler,
  deletePerformanceReviewHandler,
} from '../controllers/performanceController.js';

const router = Router();

router.get('/', listPerformanceReviewsHandler);
router.get('/:id', getPerformanceReviewHandler);
router.post('/', createPerformanceReviewHandler);
router.patch('/:id', updatePerformanceReviewHandler);
router.delete('/:id', deletePerformanceReviewHandler);

export default router;
