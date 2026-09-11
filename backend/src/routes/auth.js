import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { loginSchema, refreshSchema, loginPinSchema, pinSetupSchema } from '../shared/contracts/auth.js';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/login-pin', authLimiter, validate(loginPinSchema), authController.loginPin);
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh);
// NOTE: /auth is public — PIN management is per-route protected.
router.post('/pin/setup', requireAuth, validate(pinSetupSchema), authController.setupPin);
router.delete('/pin', requireAuth, authController.removePin);

export default router;
