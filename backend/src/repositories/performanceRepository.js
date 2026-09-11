import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export async function findPerformanceReviews(req, { page = 1, limit = 50, employeeId, reviewYear, status } = {}) {
  let where = withTenant(req, {});
  if (employeeId) where.employeeId = employeeId;
  if (reviewYear) where.reviewYear = reviewYear;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.performanceReview.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { employee: { include: { department: true, position: true } } },
    }),
    prisma.performanceReview.count({ where }),
  ]);

  return { items, total, page, limit };
}

export async function findPerformanceReviewById(req, id) {
  return prisma.performanceReview.findUnique({
    where: withTenant(req, { id }),
    include: { employee: { include: { department: true, position: true } } },
  });
}

export async function createPerformanceReview(req, data) {
  const stamped = stampTenant(req, data);
  return prisma.performanceReview.create({
    data: stamped,
    include: { employee: { include: { department: true, position: true } } },
  });
}

export async function updatePerformanceReview(req, id, data) {
  const stamped = stampTenant(req, data);
  return prisma.performanceReview.update({
    where: withTenant(req, { id }),
    data: stamped,
    include: { employee: { include: { department: true, position: true } } },
  });
}

export async function deletePerformanceReview(req, id) {
  return prisma.performanceReview.delete({ where: withTenant(req, { id }) });
}
