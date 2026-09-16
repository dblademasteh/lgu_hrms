import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { assertInTenant } from './tenantRefs.js';

export async function findInterviews(req, { page = 1, limit = 50, applicantId } = {}) {
  const where = withTenant(req, {});
  if (applicantId) where.applicantId = applicantId;
  const [items, total] = await Promise.all([
    prisma.interview.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { applicant: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { scheduledAt: 'desc' },
    }),
    prisma.interview.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function findInterviewById(req, id) {
  return prisma.interview.findFirst({
    where: withTenant(req, { id }),
    include: { applicant: true },
  });
}

export async function createInterview(req, data) {
  await assertInTenant(req, 'applicant', data.applicantId, 'Applicant');
  return prisma.interview.create({
    data: stampTenant(req, data),
    include: { applicant: true },
  });
}

export async function updateInterview(req, id, data) {
  const scope = withTenant(req, { id });
  const existing = await prisma.interview.findFirst({ where: scope });
  if (!existing) {
    const err = new Error('Interview not found');
    err.status = 404;
    throw err;
  }
  return prisma.interview.update({
    where: scope,
    data: stampTenant(req, data),
    include: { applicant: true },
  });
}

export async function deleteInterview(req, id) {
  const scope = withTenant(req, { id });
  const existing = await prisma.interview.findFirst({ where: scope });
  if (!existing) {
    const err = new Error('Interview not found');
    err.status = 404;
    throw err;
  }
  return prisma.interview.delete({ where: scope });
}
