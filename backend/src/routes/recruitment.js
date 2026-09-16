import { Router } from 'express';
import * as ctrl from '../controllers/recruitmentController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import {
  listApplicantsSchema,
  createApplicantSchema,
  updateApplicantSchema,
  hireApplicantSchema,
  listEligibilitiesSchema,
  createEligibilitySchema,
} from '../shared/contracts/recruitment.js';

const router = Router();

router.use(requirePermission('recruitmentCRUD'));

router.get('/applicants', validate(listApplicantsSchema), ctrl.listApplicantsHandler);
router.post('/applicants', validate(createApplicantSchema), ctrl.createApplicantHandler);
router.patch('/applicants/:id', validate(updateApplicantSchema), ctrl.updateApplicantHandler);
router.post('/applicants/:id/hire', validate(hireApplicantSchema), ctrl.hireApplicantHandler);
router.get('/eligibilities', validate(listEligibilitiesSchema), ctrl.listEligibilitiesHandler);
router.post('/eligibilities', validate(createEligibilitySchema), ctrl.createEligibilityHandler);

export default router;
