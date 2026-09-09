import { prisma } from '../lib/prisma.js';
export const findContributionRules = (where)=> prisma.contributionRule.findMany({ where, orderBy:{ effectiveFrom:'desc' } });
export const createContributionRule = (data)=> prisma.contributionRule.create({ data });
export const findTaxBrackets = (where)=> prisma.taxBracket.findMany({ where, orderBy:{ minIncome:'asc' } });
export const createTaxBracket = (data)=> prisma.taxBracket.create({ data });
export const findLeaveRuleConfigs = (where)=> prisma.leaveRuleConfig.findMany({ where, orderBy:{ effectiveFrom:'desc' } });
export const createLeaveRuleConfig = (data)=> prisma.leaveRuleConfig.create({ data });
