import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const idParam = z.object({ id: z.string().min(1) });

const disqualificationType = z.enum([
  'VIOLATION_OF_CSC_RULES',
  'CRIMINAL_CONVICTION',
  'MORAL_TURPITUDE',
  'FRAUD',
  'MISCONDUCT',
  'OTHER',
]);

const disqualificationReason = z.enum([
  'GROSS_MISCONDUCT',
  'HARRASSMENT',
  'EMBEZZLEMENT',
  'FRAUDULENT_MISREPRESENTATION',
  'SUBSTANCE_ABUSE',
  'POLITICAL_PARTISANISM',
  'OTHER_GROUNDS',
]);

export const createDisqualificationSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    type: disqualificationType,
    reason: disqualificationReason,
    date: dateField,
    validity: dateField.optional().nullable(),
    remarks: z.string().max(1000).optional().nullable(),
    isBarred: z.boolean().optional().default(false),
  }),
};

export const updateDisqualificationSchema = {
  params: idParam,
  body: z.object({
    type: disqualificationType.optional(),
    reason: disqualificationReason.optional(),
    date: dateField.optional(),
    validity: dateField.optional().nullable(),
    remarks: z.string().max(1000).optional().nullable(),
    isBarred: z.boolean().optional(),
  }).refine(o => Object.keys(o).length > 0, { message: 'No updatable fields provided' }),
};

export const disqualificationIdSchema = {
  params: idParam,
};

export const disqualificationReportSchema = {
  query: z.object({
    dateFrom: dateField.optional(),
    dateTo: dateField.optional(),
    type: disqualificationType.optional(),
    reason: disqualificationReason.optional(),
    isBarred: z.enum(['true', 'false']).optional(),
  }),
};
