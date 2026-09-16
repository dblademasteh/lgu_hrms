import { Router } from 'express';
import * as ctrl from '../controllers/vacancyController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import {
  listVacancySchema,
  getVacancySchema,
  createVacancySchema,
  updateVacancySchema,
  deleteVacancySchema,
} from '../shared/contracts/vacancy.js';

const router = Router();

router.use(requirePermission('recruitmentCRUD'));

router.get('/', validate(listVacancySchema), ctrl.listHandler);
router.get('/:id', validate(getVacancySchema), ctrl.getHandler);
router.post('/', validate(createVacancySchema), ctrl.createHandler);
router.patch('/:id', validate(updateVacancySchema), ctrl.updateHandler);
router.delete('/:id', validate(deleteVacancySchema), ctrl.deleteHandler);

export default router;
