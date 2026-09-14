import { Router } from 'express';
import { databaseController } from '../controllers/databaseController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

// NOTE: requireAuth + auditLog are mounted globally in routes/index.js.
// Tenant-safe endpoints are available to ADMIN and SUPER_ADMIN.
// Platform-wide / sensitive endpoints require SUPER_ADMIN explicitly.
const router = Router();

router.use(requireAuth);
router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

router.get('/tenant-dump', databaseController.tenantDump);
router.get('/tenant-export', databaseController.tenantBackup);

router.get('/', databaseController.listTables);
router.get('/summary', databaseController.summary);
router.get('/health', databaseController.health);
router.get('/migrations', databaseController.migrations);
router.get('/:name/schema', databaseController.tableSchema);
router.get('/:name/browse', databaseController.browse);
router.get('/:name/dependents/:id', databaseController.dependents);
router.get('/:name/export', databaseController.exportData);
router.get('/:name/:id', databaseController.getOne);

router.use(requireRole('SUPER_ADMIN'));

router.get('/backup', databaseController.backup);
router.get('/dump', databaseController.dump);
router.get('/slow-queries', databaseController.slowQueries);
router.get('/retention', databaseController.retention);
router.get('/connections', databaseController.connections);
router.get('/size', databaseController.databaseSize);

router.post('/query', databaseController.query);
router.post('/retention/run', databaseController.retentionRun);
router.post('/:name', databaseController.create);
router.post('/:name/import', databaseController.importCsv);
router.put('/:name/:id', databaseController.update);
router.delete('/:name/:id', databaseController.remove);

router.post('/maintenance/vacuum', databaseController.vacuum);
router.post('/maintenance/analyze', databaseController.analyze);
router.post('/maintenance/reindex', databaseController.reindex);

export default router;
