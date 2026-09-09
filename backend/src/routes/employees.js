import { Router } from 'express';
import { listEmployeesHandler, getEmployeeHandler } from '../controllers/employeeController.js';

const router = Router();

router.get('/', listEmployeesHandler);
router.get('/:id', getEmployeeHandler);

export default router;
