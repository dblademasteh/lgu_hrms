import { Router } from 'express';
import { documentController } from '../controllers/documentController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { upload } from '../middleware/upload.js';
import { tenantContext } from '../middleware/tenant.js';
import { uploadLimiter, downloadLimiter, publicDownloadLimiter } from '../middleware/rateLimit.js';
import { validateUploadedFile } from '../middleware/upload.js';
import {
  createDocumentSchema,
  updateDocumentSchema,
  listDocumentsSchema,
  documentIdSchema,
  documentIdStatusSchema,
  listDocumentAccessSchema,
  listDocumentAccessExportSchema,
  workflowSchema,
} from '../shared/contracts/documents.js';

// NOTE: the main `/documents` router is mounted AFTER requireAuth +
// tenantContext + auditLog in routes/index.js. The `publicDownloadRouter`
// below is mounted BEFORE requireAuth (like publicPunchRouter) so anyone
// with a valid tenant subdomain can download PUBLISHED documents.
//
// requireAuth is applied per-route on write operations via requirePermission.

const router = Router();

// Authenticated read/list routes (requireAuth + tenantContext + auditLog
// are mounted globally in routes/index.js).
router.get('/', requirePermission('documentsCRUD'), validate(listDocumentsSchema), documentController.list);
router.get('/stats', requirePermission('documentsCRUD'), documentController.stats);
router.get('/tracking', requirePermission('documentsTrack'), validate(listDocumentAccessSchema), documentController.trackingFeed);
router.get('/tracking/export', requirePermission('documentsTrack'), validate(listDocumentAccessExportSchema), documentController.trackingExport);
router.get('/workflow', validate(workflowSchema), documentController.workflow);
router.get('/:id', requirePermission('documentsCRUD'), validate(documentIdSchema), documentController.get);
router.get('/:id/tracking', requirePermission('documentsTrack'), validate(documentIdSchema), documentController.documentTracking);
router.get('/:id/download', requirePermission('documentsCRUD'), downloadLimiter, validate(documentIdSchema), documentController.download);

// Write operations — capability-gated + upload rate limit.
router.post('/', requirePermission('documentsCRUD'), uploadLimiter, upload.single('file'), validateUploadedFile, validate(createDocumentSchema), documentController.create);
router.patch('/:id', requirePermission('documentsCRUD'), uploadLimiter, upload.single('file'), validateUploadedFile, validate(documentIdSchema), validate(updateDocumentSchema), documentController.update);
router.delete('/:id', requirePermission('documentsCRUD'), validate(documentIdSchema), documentController.remove);
router.patch('/:id/status/:status', requirePermission('documentsCRUD'), validate(documentIdStatusSchema), documentController.setStatus);

// Public download router (mounted before requireAuth in routes/index.js).
// tenantContext is applied inline since the global mount hasn't run yet.
const publicDownloadRouter = Router();
publicDownloadRouter.use(tenantContext);
publicDownloadRouter.use((req, _res, next) => {
  req.publicDownloadOnly = true;
  next();
});
publicDownloadRouter.get('/:id/download', publicDownloadLimiter, validate(documentIdSchema), documentController.download);

export default router;
export { publicDownloadRouter };
