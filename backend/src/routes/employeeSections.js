import { Router } from 'express';
import {
  listSectionHandler,
  createSectionHandler,
  updateSectionHandler,
  deleteSectionHandler,
} from '../controllers/employeeSectionController.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router({ mergeParams: true });

const sectionParamSchema = {
  params: z.object({
    id: z.string().min(1),
    section: z.enum(['eligibilities', 'family', 'education', 'awards', 'history', 'appointments', 'leave', 'leaveCredits', 'attendance', 'payroll', 'performance', 'training', 'loans']),
  }),
};

const recordParamSchema = {
  params: sectionParamSchema.params.extend({ recordId: z.string().min(1) }),
};

router.get('/:section', validate(sectionParamSchema), listSectionHandler);
router.post('/:section', validate(sectionParamSchema), createSectionHandler);
router.patch('/:section/:recordId', validate(recordParamSchema), updateSectionHandler);
router.delete('/:section/:recordId', validate(recordParamSchema), deleteSectionHandler);

export default router;
