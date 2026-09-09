import { Router } from 'express';
import * as ctrl from '../controllers/recruitmentController.js';
const router = Router();
router.get('/applicants', ctrl.listApplicantsHandler);
router.post('/applicants', ctrl.createApplicantHandler);
router.patch('/applicants/:id', ctrl.updateApplicantHandler);
router.get('/eligibilities', ctrl.listEligibilitiesHandler);
router.post('/eligibilities', ctrl.createEligibilityHandler);
export default router;
