import { Router } from 'express';
import {
  listSectionHandler,
  createSectionHandler,
  updateSectionHandler,
  deleteSectionHandler,
} from '../controllers/employeeSectionController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { sectionParamSchema, recordParamSchema, createSectionBodySchema, updateSectionBodySchema } from '../shared/contracts/employeeSections.js';

const router = Router({ mergeParams: true });

// Employee PII blocks share the employeeRecordsCRUD matrix capability.
router.use(requirePermission('employeeRecordsCRUD'));

router.get('/:section', validate(sectionParamSchema), listSectionHandler);
router.post('/:section', validate({ ...sectionParamSchema, ...createSectionBodySchema }), createSectionHandler);
router.patch('/:section/:recordId', validate({ ...recordParamSchema, ...updateSectionBodySchema }), updateSectionHandler);
router.delete('/:section/:recordId', validate(recordParamSchema), deleteSectionHandler);

export default router;
