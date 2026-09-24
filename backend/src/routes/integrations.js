import { Router } from 'express';
import { requireApiKey, requireScope } from '../middleware/apiKey.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { tenantContext } from '../middleware/tenant.js';
import { createApiKey, listApiKeys, revokeApiKey } from '../controllers/apiKeyController.js';
import { listWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, rotateWebhookSecret } from '../controllers/webhookController.js';
import { listExternalSystems, createExternalSystem, updateExternalSystem, deleteExternalSystem } from '../controllers/externalSystemController.js';
import { prisma } from '../lib/prisma.js';
import { attendanceController } from '../controllers/attendanceController.js';
import { integrationsAttendancePunchSchema, integrationsAttendanceBulkSchema } from '../shared/contracts/attendance.js';
import { validate } from '../middleware/validate.js';
import { createApiKeySchema, createWebhookSchema, updateWebhookSchema, createExternalSystemSchema, updateExternalSystemSchema } from '../shared/contracts/integrations.js';

const router = Router();

// Public docs
router.get('/health', (req, res) => res.json({ ok: true }));

// API-key-authenticated ingestion endpoints (no JWT required)
// These must come BEFORE the SUPER_ADMIN requireAuth block below.
router.use('/attendance', requireApiKey, requireScope('attendance:ingest'));
router.post('/attendance/punch', validate(integrationsAttendancePunchSchema), attendanceController.ingestPunch);
router.post('/attendance/bulk', validate(integrationsAttendanceBulkSchema), attendanceController.bulkIngest);
router.post('/attendance/test', (req, res) => {
  res.json({ ok: true, message: 'Attendance ingestion endpoint reachable', tenantId: req.tenantContext.tenantId });
});

router.use('/employees', requireApiKey, requireScope('employees:read'));
router.get('/employees', async (req, res) => {
  try {
    const tenantId = req.tenantContext.tenantId;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const search = req.query.search;

    const where = {
      tenantId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastName: 'asc' },
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          middleName: true,
          birthDate: true,
          gender: true,
          civilStatus: true,
          address: true,
          contactNumber: true,
          email: true,
          status: true,
          department: { select: { id: true, name: true, code: true } },
          position: { select: { id: true, title: true} },
          hiredDate: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.employee.count({ where }),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.use('/departments', requireApiKey, requireScope('employees:read'));
router.get('/departments', async (req, res) => {
  try {
    const tenantId = req.tenantContext.tenantId;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);
    const search = req.query.search;

    const where = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { code: 'asc' },
        select: { id: true, code: true, name: true },
      }),
      prisma.department.count({ where }),
    ]);

    res.json({ items, total, page, limit });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Integration management is SUPER_ADMIN only (JWT required)
router.use(requireAuth, requireRole('SUPER_ADMIN'));

// API Keys management (tenant-scoped)
router.get('/keys', tenantContext, listApiKeys);
router.post('/keys', tenantContext, validate(createApiKeySchema), createApiKey);
router.delete('/keys/:id', tenantContext, revokeApiKey);

// Webhooks management (tenant-scoped)
router.get('/webhooks', tenantContext, listWebhooks);
router.post('/webhooks', tenantContext, validate(createWebhookSchema), createWebhook);
router.put('/webhooks/:id', tenantContext, validate(updateWebhookSchema), updateWebhook);
router.delete('/webhooks/:id', tenantContext, deleteWebhook);
router.post('/webhooks/:id/test', tenantContext, testWebhook);
router.post('/webhooks/:id/rotate-secret', tenantContext, rotateWebhookSecret);

// External Systems management (tenant-scoped)
router.get('/external-systems', tenantContext, listExternalSystems);
router.post('/external-systems', tenantContext, validate(createExternalSystemSchema), createExternalSystem);
router.put('/external-systems/:id', tenantContext, validate(updateExternalSystemSchema), updateExternalSystem);
router.delete('/external-systems/:id', tenantContext, deleteExternalSystem);

export default router;
