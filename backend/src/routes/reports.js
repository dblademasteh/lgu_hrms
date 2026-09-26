import { Router } from 'express';
import { reportsController } from '../controllers/reportsController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { payrollSummarySchema, payrollRegisterSchema, payrollJournalSchema, employeeMasterListSchema } from '../shared/contracts/reports.js';

// NOTE: requireAuth is mounted globally in routes/index.js.
// Payroll summaries are compliance-sensitive: reports capability
// (defaults: ADMIN, HR_MANAGER, PAYROLL_OFFICER, AUDITOR).
const router = Router();
router.use(requirePermission('reports'));

router.get('/payroll-summary', validate(payrollSummarySchema), reportsController.payrollSummary);

// COA Payroll Register: per-employee breakdown CSV
router.get('/payroll-register', validate(payrollRegisterSchema), reportsController.payrollRegister);

// Payroll Journal: COA debit/credit ledger CSV
router.get('/payroll-journal', validate(payrollJournalSchema), reportsController.payrollJournal);

// Employee Master List: personnel directory CSV
router.get('/employee-master-list', validate(employeeMasterListSchema), reportsController.employeeMasterList);

export default router;
