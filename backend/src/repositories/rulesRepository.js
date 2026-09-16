import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

// Contribution/tax/leave rules drive payroll math: reads must be tenant-scoped
// and writes must stamp tenantId, or rules are invisible to the payroll engine
// (they filter by tenantId) while readable across tenants.
function coerceRulesDates(data) {
  const out = { ...data };
  for (const key of ['effectiveFrom', 'effectiveTo']) {
    if (typeof out[key] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(out[key])) {
      out[key] = new Date(`${out[key]}T00:00:00.000Z`);
    }
  }
  return out;
}

export const findContributionRules = (req, where = {}) =>
  prisma.contributionRule.findMany({ where: withTenant(req, where), orderBy: { effectiveFrom: 'desc' } });
export const createContributionRule = (req, data) =>
  prisma.contributionRule.create({ data: stampTenant(req, coerceRulesDates(data)) });
export const findTaxBrackets = (req, where = {}) =>
  prisma.taxBracket.findMany({ where: withTenant(req, where), orderBy: { minIncome: 'asc' } });
export const createTaxBracket = (req, data) =>
  prisma.taxBracket.create({ data: stampTenant(req, coerceRulesDates(data)) });
export const findLeaveRuleConfigs = (req, where = {}) =>
  prisma.leaveRuleConfig.findMany({ where: withTenant(req, where), orderBy: { effectiveFrom: 'desc' } });
export const createLeaveRuleConfig = (req, data) =>
  prisma.leaveRuleConfig.create({ data: stampTenant(req, coerceRulesDates(data)) });