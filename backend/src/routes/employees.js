import { Router } from 'express';
import { listEmployeesHandler, getEmployeeHandler, createEmployeeHandler, updateEmployeeHandler, deleteEmployeeHandler, bulkEmployeesHandler } from '../controllers/employeeController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { createEmployeeSchema, updateEmployeeSchema, employeeIdSchema, bulkEmployeesSchema, listEmployeesSchema } from '../shared/contracts/employee.js';

const router = Router();

// Bulk import endpoint with permissive capability check (employeeRecordsCRUD or manageUsersAndRoles)
router.post('/bulk', validate(bulkEmployeesSchema), requirePermission('employeeRecordsCRUD', 'manageUsersAndRoles'), bulkEmployeesHandler);

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js;
// audit middleware writes AuditLog for every mutating request.
// Employee records require the employeeRecordsCRUD capability (matrix-backed).
router.use(requirePermission('employeeRecordsCRUD'));

router.get('/', validate(listEmployeesSchema), listEmployeesHandler);
router.get('/:id', validate(employeeIdSchema), getEmployeeHandler);
router.post('/', validate(createEmployeeSchema), createEmployeeHandler);
router.patch('/:id', validate(updateEmployeeSchema), updateEmployeeHandler);
router.delete('/:id', validate(employeeIdSchema), deleteEmployeeHandler);

export default router;
