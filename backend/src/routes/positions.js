import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';

const router = Router();

// Lightweight read-only list for form selects (positions are managed via plantilla).
router.get('/', async (req, res, next) => {
  try {
    const positions = await prisma.position.findMany({
      where: withTenant(req),
      orderBy: [{ salaryGrade: 'asc' }, { title: 'asc' }],
    });
    res.json(positions);
  } catch (e) {
    next(e);
  }
});

export default router;
