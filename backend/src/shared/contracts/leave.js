import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const idParam = z.object({ id: z.string().min(1) });
const leaveType = z.enum([
  'VACATION',
  'SICK',
  'SPECIAL_PRIVILEGE',
  'MATERNITY',
  'PATERNITY',
  'SOLO_PARENT',
  'SPECIAL_WOMEN',
  'COMPENSATORY',
]);

export const createLeaveRequestSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    type: leaveType,
    fromDate: dateField,
    toDate: dateField,
    days: z.number().positive().max(365).optional(),
    reason: z.string().max(500).optional().nullable(),
    isHalfDay: z.boolean().optional().default(false),
    isLwop: z.boolean().optional().default(false),
    isTerminal: z.boolean().optional().default(false),
    isForced: z.boolean().optional().default(false),
    studyBondMonths: z.number().int().min(0).max(60).optional().nullable(),
    documentUrl: z.string().max(500).optional().nullable(),
    advanceNoticed: z.boolean().optional().default(false),
  }),
};

export const updateLeaveRequestSchema = {
  params: idParam,
  body: z.object({
    status: z.enum(['PENDING', 'RECOMMENDED', 'APPROVED', 'DENIED', 'CANCELLED']).optional(),
    note: z.string().max(500).optional().nullable(),
    recommendedBy: z.string().min(1).optional().nullable(),
    recommendedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    approvedBy: z.string().min(1).optional().nullable(),
    approvedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    deniedBy: z.string().min(1).optional().nullable(),
    deniedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    isHalfDay: z.boolean().optional(),
    isLwop: z.boolean().optional(),
    isTerminal: z.boolean().optional(),
    isForced: z.boolean().optional(),
    studyBondMonths: z.number().int().min(0).max(60).optional().nullable(),
    documentUrl: z.string().max(500).optional().nullable(),
    advanceNoticed: z.boolean().optional(),
    decisionNote: z.string().max(500).optional().nullable(),
  }).refine(o => Object.keys(o).length > 0, { message: 'No updatable fields provided' }),
};

export const monetizeLeaveSchema = {
  params: idParam,
  // No client-sent amount/rate — the monetization value is always computed
  // server-side (CSC MC No. 2 s. 2016: unused days × S/22 × constant factor).
  body: z.object({
    note: z.string().max(500).optional().nullable(),
  }),
};

export const leaveRequestIdSchema = {
  params: idParam,
};
