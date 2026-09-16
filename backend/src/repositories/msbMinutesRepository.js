import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const msbMinutesRepository = {
  async findAll(req, { page = 1, limit = 50, interviewId } = {}) {
    const where = withTenant(req, {});
    if (interviewId) where.interviewId = interviewId;

    const [minutes, total] = await Promise.all([
      prisma.mSBMinutes.findMany({
        where,
        include: {
          interview: {
            select: {
              id: true,
              scheduledAt: true,
              status: true,
              applicant: {
                select: {
                  firstName: true,
                  lastName: true,
                  middleName: true,
                },
              },
            },
          },
        },
        orderBy: { deliberationDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mSBMinutes.count({ where }),
    ]);

    return { minutes, total, page, limit };
  },

  async findById(req, id) {
    const scope = withTenant(req, { id });
    return prisma.mSBMinutes.findFirst({
      where: scope,
      include: {
        interview: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            applicant: {
              select: {
                firstName: true,
                lastName: true,
                middleName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  },

  async create(req, data) {
    const stamped = stampTenant(req, data);
    return prisma.mSBMinutes.create({
      data: stamped,
      include: {
        interview: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            applicant: {
              select: {
                firstName: true,
                lastName: true,
                middleName: true,
              },
            },
          },
        },
      },
    });
  },

  async update(req, id, data) {
    const scope = withTenant(req, { id });
    const existing = await prisma.mSBMinutes.findFirst({ where: scope });
    if (!existing) {
      const e = new Error('MSB Minutes not found');
      e.status = 404;
      throw e;
    }
    return prisma.mSBMinutes.update({
      where: withTenant(req, { id }),
      data,
      include: {
        interview: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            applicant: {
              select: {
                firstName: true,
                lastName: true,
                middleName: true,
              },
            },
          },
        },
      },
    });
  },

  async delete(req, id) {
    const scope = withTenant(req, { id });
    const existing = await prisma.mSBMinutes.findFirst({ where: scope });
    if (!existing) {
      const e = new Error('MSB Minutes not found');
      e.status = 404;
      throw e;
    }
    return prisma.mSBMinutes.delete({ where: withTenant(req, { id }) });
  },
};
