import { Router } from 'express';
import { tenantRepository } from '../middleware/tenant.js';
import { requireRole } from '../middleware/rbac.js';
import { z } from 'zod';

const createTenantSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  domain: z.string().optional().nullable(),
  lguLevel: z.enum(['PROVINCIAL', 'CITY', 'MUNICIPAL']).default('PROVINCIAL'),
});

const CIDR_RE = /^[0-9a-fA-F:.]+(\/\d{1,3})?$/;

const router = Router();

// Public tenant list for login picker
router.get('/', async (req, res, next) => {
  try {
    const tenants = await tenantRepository.list();
    res.json(tenants);
  } catch (e) {
    next(e);
  }
});

// Tenant administration is SUPER_ADMIN-only
router.use(requireRole('SUPER_ADMIN'));

router.get('/:id', async (req, res, next) => {
  try {
    const tenant = await tenantRepository.get(req.params.id);
    if (!tenant) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tenant not found' } });
    // Include the caller's own source IP so the operator can allowlist themselves.
    res.json({ ...tenant, clientIp: req.ip });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = createTenantSchema.parse(req.body || {});
    res.status(201).json(await tenantRepository.create(parsed));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: { code: 'CONFLICT', message: 'Tenant code or domain already exists' } });
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { name, domain, isActive, lguLevel, allowedIps } = req.body || {};
    const data = {};
    if (name !== undefined) data.name = name;
    if (domain !== undefined) data.domain = domain;
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'isActive must be a boolean' } });
      data.isActive = isActive;
    }
    if (lguLevel) data.lguLevel = lguLevel;
    if (allowedIps !== undefined) {
      const list = (Array.isArray(allowedIps) ? allowedIps : [allowedIps]).map(s => String(s).trim()).filter(Boolean);
      for (const cidr of list) {
        if (!CIDR_RE.test(cidr)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Invalid CIDR: ${cidr}` } });
      }
      data.allowedIps = list;
    }
    res.json(await tenantRepository.update(req.params.id, data));
  } catch (e) { next(e); }
});

export default router;
