import { Router } from 'express';
import { interviewController as ctrl } from '../controllers/interviewController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import {
  listInterviewsSchema,
  getInterviewSchema,
  createInterviewSchema,
  updateInterviewSchema,
  deleteInterviewSchema,
} from '../shared/contracts/interviews.js';

const router = Router();

router.use(requirePermission('interviewCRUD'));

router.get('/', validate(listInterviewsSchema), ctrl.list);
router.get('/:id', validate(getInterviewSchema), ctrl.get);
router.post('/', validate(createInterviewSchema), ctrl.create);
router.patch('/:id', validate(updateInterviewSchema), ctrl.update);
router.delete('/:id', validate(deleteInterviewSchema), ctrl.remove);

export default router;
