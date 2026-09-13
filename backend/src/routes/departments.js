import { Router } from 'express';
import { departmentsController } from '../controllers/departmentsController.js';
import { requirePermission } from '../middleware/permission.js';
import { validate } from '../middleware/validate.js';
import { createDepartmentSchema, updateDepartmentSchema, departmentIdSchema } from '../shared/contracts/departments.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
const router = Router();

router.get('/', requirePermission('employeeRecordsCRUD'), departmentsController.list);
router.post('/', requirePermission('employeeRecordsCRUD'), validate(createDepartmentSchema), departmentsController.create);
router.patch('/:id', requirePermission('employeeRecordsCRUD'), validate(updateDepartmentSchema), departmentsController.update);
router.delete('/:id', requirePermission('employeeRecordsCRUD'), validate(departmentIdSchema), departmentsController.remove);

export default router;