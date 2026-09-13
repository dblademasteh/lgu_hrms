import { Router } from 'express';
import { appointmentsController } from '../controllers/appointmentsController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { createAppointmentSchema, updateAppointmentSchema, appointmentIdSchema } from '../shared/contracts/appointments.js';

const router = Router();

router.get('/', requirePermission('appointmentsRead'), appointmentsController.list);
router.post('/', requirePermission('appointmentsCRUD'), validate(createAppointmentSchema), appointmentsController.create);
router.patch('/:id', requirePermission('appointmentsCRUD'), validate(updateAppointmentSchema), appointmentsController.update);
router.delete('/:id', requirePermission('appointmentsCRUD'), validate(appointmentIdSchema), appointmentsController.remove);

export default router;
