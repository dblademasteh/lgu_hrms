import { Router } from 'express';
import { requireApiKey } from '../middleware/apiKey.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenant.js';
import { createApiKey, listApiKeys, revokeApiKey } from '../controllers/apiKeyController.js';
import { listWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, rotateWebhookSecret } from '../controllers/webhookController.js';
import { listExternalSystems, createExternalSystem, updateExternalSystem, deleteExternalSystem } from '../controllers/externalSystemController.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Public docs
router.get('/health', (req, res) => res.json({ ok: true }));

// API Keys management (tenant-scoped)
router.get('/keys', requireAuth, tenantContext, listApiKeys);
router.post('/keys', requireAuth, tenantContext, createApiKey);
router.delete('/keys/:id', requireAuth, tenantContext, revokeApiKey);

// Webhooks management (tenant-scoped)
router.get('/webhooks', requireAuth, tenantContext, listWebhooks);
router.post('/webhooks', requireAuth, tenantContext, createWebhook);
router.put('/webhooks/:id', requireAuth, tenantContext, updateWebhook);
router.delete('/webhooks/:id', requireAuth, tenantContext, deleteWebhook);
router.post('/webhooks/:id/test', requireAuth, tenantContext, testWebhook);
router.post('/webhooks/:id/rotate-secret', requireAuth, tenantContext, rotateWebhookSecret);

// External Systems management (tenant-scoped)
router.get('/external-systems', requireAuth, tenantContext, listExternalSystems);
router.post('/external-systems', requireAuth, tenantContext, createExternalSystem);
router.put('/external-systems/:id', requireAuth, tenantContext, updateExternalSystem);
router.delete('/external-systems/:id', requireAuth, tenantContext, deleteExternalSystem);

// Protected by API key - Employees endpoint
router.use('/employees', requireApiKey);
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

// Protected by API key - Departments endpoint
router.use('/departments', requireApiKey);
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

export default router;
