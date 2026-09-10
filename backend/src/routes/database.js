import { Router } from 'express';
import { databaseController } from '../controllers/databaseController.js';
import { requireRole } from '../middleware/rbac.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
// Database management endpoints are admin-only.
const router = Router();

router.use(requireRole('ADMIN'));

router.get('/', databaseController.listTables);
router.get('/summary', databaseController.summary);
router.get('/:name/schema', databaseController.tableSchema);
router.get('/:name/browse', databaseController.browse);
router.get('/:name/:id', databaseController.getOne);
router.delete('/:name/:id', databaseController.remove);

export default router;
