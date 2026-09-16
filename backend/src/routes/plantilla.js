import { Router } from 'express';
import * as ctrl from '../controllers/plantillaController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import {
  listPlantillaSchema,
  getPlantillaSchema,
  createPlantillaSchema,
  updatePlantillaSchema,
  deletePlantillaSchema,
} from '../shared/contracts/plantilla.js';

const router = Router();

router.use(requirePermission('employeeRecordsCRUD'));

router.get('/', validate(listPlantillaSchema), ctrl.listHandler);
router.get('/:id', validate(getPlantillaSchema), ctrl.getHandler);
router.post('/', validate(createPlantillaSchema), ctrl.createHandler);
router.patch('/:id', validate(updatePlantillaSchema), ctrl.updateHandler);
router.delete('/:id', validate(deletePlantillaSchema), ctrl.deleteHandler);

export default router;
