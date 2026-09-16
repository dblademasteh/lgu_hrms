import { Router } from 'express';
import * as ctrl from '../controllers/designationController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import {
  listDesignationSchema,
  getDesignationSchema,
  createDesignationSchema,
  updateDesignationSchema,
  deleteDesignationSchema,
} from '../shared/contracts/designation.js';

const router = Router();

router.use(requirePermission('appointmentsCRUD'));

router.get('/', validate(listDesignationSchema), ctrl.listHandler);
router.get('/:id', validate(getDesignationSchema), ctrl.getHandler);
router.post('/', validate(createDesignationSchema), ctrl.createHandler);
router.patch('/:id', validate(updateDesignationSchema), ctrl.updateHandler);
router.delete('/:id', validate(deleteDesignationSchema), ctrl.deleteHandler);

export default router;
