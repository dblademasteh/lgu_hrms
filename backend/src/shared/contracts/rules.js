import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

// Money/rates travel as decimal STRINGS so Prisma stores exact Decimals and
// the payroll engine (`new Prisma.Decimal(...)`) never sees JS floats.
// Precision mirrors the columns: rate Decimal(5,4) ≤ 9.9999; money Decimal(12,2).
const rateString = z.string().regex(/^\d(\.\d{1,4})?$/, 'Expected a rate between 0 and 9.9999');
const money12 = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, 'Expected an amount (<= 12,2 precision)');
const money4 = z.string().regex(/^\d{1,2}(\.\d{1,2})?$/, 'Expected an amount (max 99.99)');
const money6 = z.string().regex(/^\d{1,6}(\.\d{1,2})?$/, 'Expected an amount (max 999999.99)');

export const createContributionRuleSchema = {
  body: z.object({
    type: z.string().min(1).max(50),
    employeeRate: rateString,
    employerRate: rateString,
    effectiveFrom: dateField,
    effectiveTo: dateField.optional().nullable(),
  }),
};

export const createTaxBracketSchema = {
  body: z.object({
    minIncome: money12,
    maxIncome: money12.optional().nullable(),
    rate: rateString,
    effectiveFrom: dateField,
    effectiveTo: dateField.optional().nullable(),
  }),
};

export const createLeaveRuleConfigSchema = {
  body: z.object({
    leaveType: z.enum(['VACATION', 'SICK', 'SPECIAL_PRIVILEGE', 'MATERNITY', 'PATERNITY', 'SOLO_PARENT', 'SPECIAL_WOMEN', 'COMPENSATORY']),
    accrualPerMonth: money4,
    maxCarryOver: money6.optional().nullable(),
    effectiveFrom: dateField,
    effectiveTo: dateField.optional().nullable(),
  }),
};