import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();

router.get('/', validate({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
}), async (req, res, next) => {
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
