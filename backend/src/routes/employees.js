import { Router } from 'express';
import { listEmployeesHandler, getEmployeeHandler, createEmployeeHandler, updateEmployeeHandler, deleteEmployeeHandler } from '../controllers/employeeController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createEmployeeSchema, updateEmployeeSchema, employeeIdSchema } from '../shared/contracts/employee.js';

const router = Router();

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js;
// audit middleware writes AuditLog for every mutating request.

router.get('/', listEmployeesHandler);
router.get('/:id', validate(employeeIdSchema), getEmployeeHandler);
router.post('/', validate(createEmployeeSchema), createEmployeeHandler);
router.patch('/:id', validate(updateEmployeeSchema), updateEmployeeHandler);
router.delete('/:id', validate(employeeIdSchema), deleteEmployeeHandler);

export default router;
