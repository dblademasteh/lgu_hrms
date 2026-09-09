import { prisma } from '../lib/prisma.js';

export async function findPerformanceReviews({ page = 1, limit = 50, employeeId, reviewYear, status }) {
  const where = {};
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

export async function findPerformanceReviewById(id) {
  return prisma.performanceReview.findUnique({
    where: { id },
    include: { employee: { include: { department: true, position: true } } },
  });
}

export async function createPerformanceReview(data) {
  return prisma.performanceReview.create({
    data,
    include: { employee: { include: { department: true, position: true } } },
  });
}

export async function updatePerformanceReview(id, data) {
  return prisma.performanceReview.update({
    where: { id },
    data,
    include: { employee: { include: { department: true, position: true } } },
  });
}

export async function deletePerformanceReview(id) {
  return prisma.performanceReview.delete({ where: { id } });
}
