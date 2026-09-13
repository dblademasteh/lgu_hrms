import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requirePermission } from '../middleware/permission.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { permissionService } from '../services/permissionService.js';
import { CAPABILITIES } from '../shared/permissions.js';

const router = Router();

/** Effective permission map for the caller's own role (no capability gate). */
router.get('/my-permissions', async (req, res, next) => {
  try {
    const permissions = await permissionService.getEffectivePermissions(req.tenantId, req.user?.role);
    res.json({ permissions });
  } catch (e) { next(e); }
});

const roleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
});

// All role administration requires the manageUsersAndRoles capability.
router.use(requirePermission('manageUsersAndRoles'));

router.get('/', async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      where: withTenant(req, {}),
      orderBy: { name: 'asc' }
    });
    res.json({ roles });
  } catch (e) { next(e); }
});

/** Capability catalog for the permission matrix (keys + labels). */
router.get('/capabilities', async (req, res, next) => {
  try {
    res.json({ capabilities: CAPABILITIES });
  } catch (e) { next(e); }
});

/** Effective permission matrix for this tenant (roles × capabilities). */
router.get('/permissions', async (req, res, next) => {
  try {
    const roles = await permissionService.listRolePermissions(req.tenantId);
    res.json({ roles });
  } catch (e) { next(e); }
});

router.post('/', validate({ body: roleSchema }), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const existing = await prisma.role.findFirst({
      where: withTenant(req, { name })
    });
    if (existing) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Role name already exists' }});
    }
    // Custom roles start with no capabilities — grant via the permission matrix.
    const role = await prisma.role.create({
      data: stampTenant(req, { name, description: description || null })
    });
    res.status(201).json({ role });
  } catch (e) { next(e); }
});

router.patch('/:name', validate({ body: roleSchema.partial() }), async (req, res, next) => {
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

router.delete('/:name', async (req, res, next) => {
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

/** Set a role's capability flags (any subset + truth values). */
router.patch('/:name/permissions', validate({
  body: z.object({
    permissions: z.record(z.boolean()),
  }),
}), async (req, res, next) => {
  try {
    const { name } = req.params;
    const map = await permissionService.setRolePermissions(req.tenantId, name, req.body.permissions);
    res.json({ role: name, permissions: map });
  } catch (e) { next(e); }
});

export default router;