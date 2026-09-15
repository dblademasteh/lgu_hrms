import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export async function findCompetencies(req, { page = 1, limit = 50 } = {}) {
  const where = withTenant(req, {});
  const [items, total] = await Promise.all([
    prisma.competency.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.competency.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function findCompetencyById(req, id) {
  return prisma.competency.findFirst({
    where: withTenant(req, { id }),
  });
}

export async function createCompetency(req, data) {
  const stamped = stampTenant(req, data);
  return prisma.competency.create({ data: stamped });
}

export async function updateCompetency(req, id, data) {
  const stamped = stampTenant(req, data);
  return prisma.competency.update({
    where: withTenant(req, { id }),
    data: stamped,
  });
}

export async function deleteCompetency(req, id) {
  const exists = await prisma.competency.findFirst({
    where: withTenant(req, { id }),
  });
  if (!exists) return null;
  return prisma.competency.delete({
    where: withTenant(req, { id }),
  });
}

export async function findPerformanceCompetencies(req, reviewId) {
  return prisma.performanceCompetency.findMany({
    where: { ...withTenant(req), reviewId },
    include: { competency: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createPerformanceCompetency(req, data) {
  const stamped = stampTenant(req, data);
  return prisma.performanceCompetency.create({
    data: stamped,
    include: { competency: true },
  });
}

export async function updatePerformanceCompetency(req, id, data) {
  const stamped = stampTenant(req, data);
  return prisma.performanceCompetency.update({
    where: withTenant(req, { id }),
    data: stamped,
    include: { competency: true },
  });
}

export async function deletePerformanceCompetency(req, id) {
  const exists = await prisma.performanceCompetency.findFirst({
    where: withTenant(req, { id }),
  });
  if (!exists) return null;
  return prisma.performanceCompetency.delete({
    where: withTenant(req, { id }),
  });
}

export async function findPerformanceReviews(req, { page = 1, limit = 50, employeeId, reviewYear, status, reviewType } = {}) {
  const where = withTenant(req, {});
  if (employeeId) where.employeeId = employeeId;
  if (reviewYear) where.reviewYear = Number(reviewYear);
  if (status) where.status = status;
  if (reviewType) where.reviewType = reviewType;

  const [items, total] = await Promise.all([
    prisma.performanceReview.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { include: { department: true, position: true } },
        targets: { orderBy: { createdAt: 'asc' } },
        competencies: { include: { competency: true }, orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.performanceReview.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function findPerformanceReviewById(req, id) {
  return prisma.performanceReview.findFirst({
    where: withTenant(req, { id }),
    include: {
      employee: { include: { department: true, position: true } },
      targets: { orderBy: { createdAt: 'asc' } },
      competencies: { include: { competency: true }, orderBy: { createdAt: 'asc' } },
    },
  });
}

export async function createPerformanceReview(req, data) {
  const stamped = stampTenant(req, data);
  return prisma.performanceReview.create({
    data: stamped,
    include: {
      employee: { include: { department: true, position: true } },
      targets: true,
      competencies: true,
    },
  });
}

export async function updatePerformanceReview(req, id, data) {
  const stamped = stampTenant(req, data);
  return prisma.performanceReview.update({
    where: withTenant(req, { id }),
    data: stamped,
    include: {
      employee: { include: { department: true, position: true } },
      targets: true,
      competencies: true,
    },
  });
}

export async function deletePerformanceReview(req, id) {
  const exists = await prisma.performanceReview.findFirst({ where: withTenant(req, { id }) });
  if (!exists) return null;
  return prisma.performanceReview.delete({ where: withTenant(req, { id }) });
}

export async function findReviewWithCompetencies(req, reviewId) {
  return prisma.performanceReview.findUnique({
    where: withTenant(req, { id: reviewId }),
    include: {
      employee: { include: { department: true, position: true } },
      targets: { orderBy: { createdAt: 'asc' } },
      competencies: { include: { competency: true }, orderBy: { createdAt: 'asc' } },
    },
  });
}

// --- Target CRUD ---

export async function findTargetsByReview(req, reviewId) {
  return prisma.performanceTarget.findMany({
    where: { ...withTenant(req), reviewId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findTargetById(req, id) {
  return prisma.performanceTarget.findFirst({
    where: withTenant(req, { id }),
  });
}

export async function createTarget(req, data) {
  const stamped = stampTenant(req, data);
  return prisma.performanceTarget.create({ data: stamped });
}

export async function updateTarget(req, id, data) {
  const stamped = stampTenant(req, data);
  return prisma.performanceTarget.update({
    where: withTenant(req, { id }),
    data: stamped,
  });
}

export async function deleteTarget(req, id) {
  const exists = await prisma.performanceTarget.findFirst({
    where: withTenant(req, { id }),
  });
  if (!exists) return null;
  return prisma.performanceTarget.delete({
    where: withTenant(req, { id }),
  });
}

export async function upsertTargets(req, reviewId, targets) {
  const results = [];
  for (const t of targets) {
    const stamped = stampTenant(req, { ...t, reviewId });
    if (t.id) {
      const updated = await prisma.performanceTarget.update({
        where: withTenant(req, { id: t.id }),
        data: stamped,
      });
      results.push(updated);
    } else {
      const created = await prisma.performanceTarget.create({ data: stamped });
      results.push(created);
    }
  }
  return results;
}

export async function deleteTargetsByReview(req, reviewId) {
  return prisma.performanceTarget.deleteMany({
    where: { ...withTenant(req), reviewId },
  });
}
