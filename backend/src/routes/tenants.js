import { Router } from 'express';
import { tenantRepository } from '../middleware/tenant.js';
import { requireRole } from '../middleware/rbac.js';

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
    const { code, name, domain } = req.body || {};
    if (!code || !name) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'code and name are required' } });
    res.status(201).json(await tenantRepository.create({ code, name, domain: domain || null }));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: { code: 'CONFLICT', message: 'Tenant code or domain already exists' } });
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { name, domain, isActive } = req.body || {};
    res.json(await tenantRepository.update(req.params.id, { ...(name && { name }), ...(domain !== undefined && { domain }), ...(isActive !== undefined && { isActive }) }));
  } catch (e) { next(e); }
});

export default router;
