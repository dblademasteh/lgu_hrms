import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/rbac.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const roleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

router.get('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      where: withTenant(req, {}),
      orderBy: { name: 'asc' }
    });
    res.json({ roles });
  } catch (e) { next(e); }
});

router.post('/', requireRole('ADMIN'), validate({ body: roleSchema }), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const existing = await prisma.role.findFirst({
      where: withTenant(req, { name })
    });
    if (existing) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Role name already exists' }});
    }
    const role = await prisma.role.create({
      data: stampTenant(req, { name, description: description || null })
    });
    res.status(201).json({ role });
  } catch (e) { next(e); }
});

router.patch('/:name', requireRole('ADMIN'), validate({ body: roleSchema.partial() }), async (req, res, next) => {
  try {
    const { name } = req.params;
    const { description } = req.body;
    const role = await prisma.role.findFirst({
      where: withTenant(req, { name })
    });
    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' }});
    }
    const updated = await prisma.role.update({
      where: { id: role.id },
      data: { description: description !== undefined ? description : role.description }
    });
    res.json({ role: updated });
  } catch (e) { next(e); }
});

router.delete('/:name', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name } = req.params;
    const role = await prisma.role.findFirst({
      where: withTenant(req, { name })
    });
    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role not found' }});
    }
    if (role.isSystem) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Cannot delete system role' }});
    }
    await prisma.role.delete({ where: { id: role.id } });
    res.json({ message: 'Role deleted' });
  } catch (e) { next(e); }
});

export default router;
