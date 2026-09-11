import { Router } from 'express';
import { databaseController } from '../controllers/databaseController.js';
import { requireRole } from '../middleware/rbac.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
// Database management endpoints are admin-only.
const router = Router();

router.use(requireRole('ADMIN'));

router.get('/', databaseController.listTables);
router.get('/summary', databaseController.summary);
router.get('/health', databaseController.health);
router.get('/migrations', databaseController.migrations);
router.get('/backup', databaseController.backup);
router.get('/dump', databaseController.dump);
router.get('/slow-queries', databaseController.slowQueries);
router.get('/retention', databaseController.retention);

router.post('/query', requireRole('SUPER_ADMIN'), databaseController.query);
router.post('/retention/run', requireRole('SUPER_ADMIN'), databaseController.retentionRun);
router.post('/:name/import', requireRole('SUPER_ADMIN'), databaseController.importCsv);

router.get('/:name/schema', databaseController.tableSchema);
router.get('/:name/browse', databaseController.browse);
router.get('/:name/export', databaseController.exportData);
router.get('/:name/dependents/:id', databaseController.dependents);
router.get('/:name/:id', databaseController.getOne);

router.post('/:name', databaseController.create);
router.put('/:name/:id', databaseController.update);
router.delete('/:name/:id', databaseController.remove);

export default router;
