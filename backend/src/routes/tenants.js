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
    const { name, domain, isActive, lguLevel } = req.body || {};
    res.json(await tenantRepository.update(req.params.id, { ...(name && { name }), ...(domain !== undefined && { domain }), ...(isActive !== undefined && { isActive }), ...(lguLevel && { lguLevel }) }));
  } catch (e) { next(e); }
});

export default router;
