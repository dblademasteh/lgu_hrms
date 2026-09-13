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
// SSO (OIDC): opt-in via OIDC_* env. Status endpoint is public so the
// login page can decide whether to show the SSO button.
router.get('/oidc/status', authController.oidcStatus);
router.get('/oidc/login', authLimiter, authController.oidcLogin);
router.get('/oidc/callback', authController.oidcCallback);
router.post('/oidc/consume', authLimiter, authController.oidcConsume);
// NOTE: /auth is public — PIN management is per-route protected.
router.post('/pin/setup', requireAuth, validate(pinSetupSchema), authController.setupPin);
router.delete('/pin', requireAuth, authController.removePin);

export default router;
