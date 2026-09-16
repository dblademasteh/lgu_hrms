import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';

export async function assertInTenant(req, model, id, label = 'Referenced record') {
  if (!id) return null;
  const found = await prisma[model].findFirst({ where: withTenant(req, { id }) });
  if (!found) {
    const e = new Error(`${label} not found in this tenant`);
    e.status = 404;
    throw e;
  }
  return found;
}