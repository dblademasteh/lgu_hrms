import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { assertInTenant } from './tenantRefs.js';

export async function findPublications(req, { vacancyId, channel } = {}) {
  const where = withTenant(req, {});
  if (vacancyId) where.vacancyId = vacancyId;
  if (channel) where.channel = channel;
  return prisma.vacancyPublication.findMany({
    where,
    include: { vacancy: { select: { id: true, title: true } } },
    orderBy: { publishedAt: 'desc' },
  });
}

export async function createPublication(req, data) {
  await assertInTenant(req, 'vacancy', data.vacancyId, 'Vacancy');
  return prisma.vacancyPublication.create({
    data: stampTenant(req, data),
    include: { vacancy: { select: { id: true, title: true } } },
  });
}

export async function deletePublication(req, id) {
  const scope = withTenant(req, { id });
  const existing = await prisma.vacancyPublication.findFirst({ where: scope });
  if (!existing) {
    const err = new Error('Publication not found');
    err.status = 404;
    throw err;
  }
  return prisma.vacancyPublication.delete({ where: scope });
}
