import { Router } from 'express';
import { attendanceController } from '../controllers/attendanceController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import { punchLimiter } from '../middleware/rateLimit.js';
import { createAttendanceSchema, updateAttendanceSchema, deleteAttendanceSchema, bulkImportAttendanceSchema, punchBiometricSchema, punchBiometricPublicSchema, listAttendanceSchema, myAttendanceSchema } from '../shared/contracts/attendance.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
const router = Router();

router.get('/', validate(listAttendanceSchema), requireRole('ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD'), attendanceController.list);
router.post('/', validate(createAttendanceSchema), requireRole('ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD'), attendanceController.create);
router.patch('/:id', validate(updateAttendanceSchema), requireRole('ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD'), attendanceController.update);
router.delete('/:id', validate(deleteAttendanceSchema), requireRole('ADMIN', 'HR_MANAGER'), attendanceController.remove);
router.post('/import', validate(bulkImportAttendanceSchema), requireRole('ADMIN', 'HR_MANAGER'), attendanceController.bulkImport);

// Self-service endpoints for employees
router.get('/my', validate(myAttendanceSchema), attendanceController.getMyAttendance);
router.get('/today', attendanceController.getTodayAttendance);
router.post('/punch', validate(punchBiometricSchema), attendanceController.punchBiometric);

// Public biometric punch endpoint - no JWT required
const publicPunchRouter = Router();
publicPunchRouter.post('/punch', punchLimiter, validate(punchBiometricPublicSchema), attendanceController.punchBiometricPublic);

export default router;
export { publicPunchRouter };
