import { Router } from 'express';
import { attendanceController } from '../controllers/attendanceController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import { createAttendanceSchema, updateAttendanceSchema, deleteAttendanceSchema, bulkImportAttendanceSchema, punchBiometricSchema, punchBiometricPublicSchema } from '../shared/contracts/attendance.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
const router = Router();

router.get('/', attendanceController.list);
router.post('/', validate(createAttendanceSchema), attendanceController.create);
router.patch('/:id', validate(updateAttendanceSchema), requireRole('ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD'), attendanceController.update);
router.delete('/:id', validate(deleteAttendanceSchema), requireRole('ADMIN', 'HR_MANAGER'), attendanceController.remove);
router.post('/import', validate(bulkImportAttendanceSchema), requireRole('ADMIN', 'HR_MANAGER'), attendanceController.bulkImport);

// Self-service endpoints for employees
router.get('/my', attendanceController.getMyAttendance);
router.get('/today', attendanceController.getTodayAttendance);
router.post('/punch', validate(punchBiometricSchema), attendanceController.punchBiometric);

// Public biometric punch endpoint - no JWT required
const publicPunchRouter = Router();
publicPunchRouter.post('/punch', validate(punchBiometricPublicSchema), attendanceController.punchBiometricPublic);

export default router;
export { publicPunchRouter };
