import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';

const router = Router();

router.use(requireAuth);

router.get('/requests', requireRole('ADMIN','HR_MANAGER'), async (req, res) => {
  const items = await prisma.syncRequest.findMany({
    where: withTenant(req, {}),
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
});

router.patch('/requests/:id/approve', requireRole('ADMIN','HR_MANAGER'), async (req, res) => {
  const { id } = req.params;
  const reqRec = await prisma.syncRequest.findFirst({ where: withTenant(req, { id }) });
  if (!reqRec) return res.status(404).json({ error: 'Not found' });
  await prisma.syncRequest.update({
    where: withTenant(req, { id }),
    data: { status: 'APPROVED', approvedBy: req.user.id, updatedAt: new Date() },
  });
  res.json({ ok: true });
});

export default router;
