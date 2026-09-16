import { Router } from 'express';
import { vacancyPublicationController as ctrl } from '../controllers/vacancyPublicationController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import {
  listVacancyPublicationsSchema,
  createVacancyPublicationSchema,
  deleteVacancyPublicationSchema,
} from '../shared/contracts/vacancyPublications.js';

const router = Router();

router.use(requirePermission('recruitmentCRUD'));

router.get('/', validate(listVacancyPublicationsSchema), ctrl.list);
router.post('/', validate(createVacancyPublicationSchema), ctrl.create);
router.delete('/:id', validate(deleteVacancyPublicationSchema), ctrl.remove);

export default router;
