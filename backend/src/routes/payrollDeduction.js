import { Router } from 'express';
import * as ctrl from '../controllers/payrollDeductionController.js';
const router = Router();
router.get('/items/:itemId/lines', ctrl.getLinesHandler);
router.post('/items/:itemId/lines', ctrl.addLinesHandler);
router.post('/items/:itemId/payslip', ctrl.upsertPayslipHandler);
export default router;
