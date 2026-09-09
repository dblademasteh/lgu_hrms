import { Router } from 'express';
import { accountController } from '../controllers/accountController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { auditLog } from '../middleware/audit.js';
import { updateProfileSchema, changePasswordSchema, revokeSessionSchema } from '../shared/contracts/account.js';

const router = Router();

router.use(requireAuth);

router.get('/me', accountController.getProfile);
router.patch('/me', validate(updateProfileSchema), auditLog, accountController.updateProfile);
router.post('/password/change', validate(changePasswordSchema), auditLog, accountController.changePassword);
router.get('/sessions', accountController.getSessions);
router.post('/sessions/:id/revoke', validate(revokeSessionSchema), auditLog, accountController.revokeSession);
router.post('/2fa/setup', accountController.setup2FA);
router.post('/2fa/verify', accountController.verify2FA);

export default router;
