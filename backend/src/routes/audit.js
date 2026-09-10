import { Router } from 'express';
import { auditController } from '../controllers/auditController.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/rbac.js';
import { z } from 'zod';

const router = Router();
// Audit trail is compliance-sensitive: ADMIN + AUDITOR only.
// NOTE: requireAuth is mounted globally in routes/index.js.
router.use(requireRole('ADMIN', 'AUDITOR'));
router.get(
  '/',
  validate({
    query: z.object({
      entity: z.string().max(100).optional(),
      userId: z.string().min(1).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(200).default(50),
    }),
  }),
  auditController.list
);

export default router;