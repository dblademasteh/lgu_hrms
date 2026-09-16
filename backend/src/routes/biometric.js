import { Router } from 'express';
import { biometricController } from '../controllers/biometricController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import { enrollBiometricSchema, verifyBiometricSchema, listBiometricSchema } from '../shared/contracts/biometric.js';
import { z } from 'zod';

const router = Router();

router.post('/enroll', validate(enrollBiometricSchema), biometricController.enroll);
router.get('/credentials', validate(listBiometricSchema), biometricController.list);
router.delete('/credentials/:credentialId', biometricController.remove);
router.post('/verify', validate(verifyBiometricSchema), biometricController.verify);

router.get('/verify-challenge', validate({ query: z.object({ credentialId: z.string().min(1) }) }), biometricController.getVerifyChallenge);
router.post('/verify-assertion', validate({ body: z.object({
  credentialId: z.string().min(1),
  authenticatorResponse: z.object({
    clientDataJSON: z.string().min(1),
    authenticatorData: z.string().min(1),
    signature: z.string().min(1),
    challenge: z.string().min(1),
  }),
  punchType: z.enum(['IN', 'OUT']).optional(),
}) }), biometricController.verifyAssertion);

router.get('/webauthn/enroll/options', biometricController.webauthnEnrollOptions);
router.post('/webauthn/enroll/verify', validate({ body: z.object({
  credential: z.object({
    id: z.string().min(1),
    rawId: z.string().min(1),
    response: z.object({
      clientDataJSON: z.string().min(1),
      attestationObject: z.string().min(1),
      transports: z.array(z.string()).optional(),
    }),
    type: z.literal('public-key'),
  }),
}) }), biometricController.webauthnEnrollVerify);

export default router;
