import { Router } from 'express';
import { biometricController } from '../controllers/biometricController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import { enrollBiometricSchema, verifyBiometricSchema, listBiometricSchema } from '../shared/contracts/biometric.js';

const router = Router();

router.post('/enroll', validate(enrollBiometricSchema), biometricController.enroll);
router.get('/credentials', validate(listBiometricSchema), biometricController.list);
router.delete('/credentials/:credentialId', biometricController.remove);
router.post('/verify', validate(verifyBiometricSchema), biometricController.verify);

export default router;
