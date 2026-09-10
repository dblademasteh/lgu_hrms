import { Router } from 'express';
import { attendanceController } from '../controllers/attendanceController.js';
import { validate } from '../middleware/validate.js';
import { createAttendanceSchema } from '../shared/contracts/attendance.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
const router = Router();

router.get('/', attendanceController.list);
router.post('/', validate(createAttendanceSchema), attendanceController.create);

export default router;