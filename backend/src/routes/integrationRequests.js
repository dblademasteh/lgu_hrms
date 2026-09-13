import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.use(requireAuth);

router.get('/requests', requireRole('ADMIN','HR_MANAGER'), async (req, res) => {
  const tenantId = req.user.tenantId;
  const items = await prisma.syncRequest.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items });
});

router.patch('/requests/:id/approve', requireRole('ADMIN','HR_MANAGER'), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const reqRec = await prisma.syncRequest.findUnique({ where: { id } });
  if (!reqRec || reqRec.tenantId !== tenantId) return res.status(404).json({ error: 'Not found' });
  await prisma.syncRequest.update({
    where: { id },
    data: { status: 'APPROVED', approvedBy: req.user.id, updatedAt: new Date() },
  });
  res.json({ ok: true });
});

export default router;
