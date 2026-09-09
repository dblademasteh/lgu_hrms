import { prisma } from '../lib/prisma.js';

export const auditService = {
  async list({ entity, page, limit }) {
    const where = entity && entity !== 'all' ? { entity } : {};
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { username: true } } },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);
    return { data: logs, total, page, limit };
  }
};