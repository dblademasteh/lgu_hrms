import { Router } from 'express';
import { accountController } from '../controllers/accountController.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema, changePasswordSchema, revokeSessionSchema } from '../shared/contracts/account.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
const router = Router();

router.get('/me', accountController.getProfile);
router.patch('/me', validate(updateProfileSchema), accountController.updateProfile);
router.post('/password/change', validate(changePasswordSchema), accountController.changePassword);
router.get('/sessions', accountController.getSessions);
router.post('/sessions/:id/revoke', validate(revokeSessionSchema), accountController.revokeSession);
router.get('/login-events', accountController.getLoginEvents);
router.get('/delegations', accountController.getDelegations);
router.post('/delegations', accountController.createDelegation);
router.delete('/delegations/:id', accountController.deleteDelegation);
router.post('/deactivate', accountController.deactivateAccount);
router.post('/export', accountController.exportData);
router.post('/2fa/setup', accountController.setup2FA);
router.post('/2fa/verify', accountController.verify2FA);

export default router;
