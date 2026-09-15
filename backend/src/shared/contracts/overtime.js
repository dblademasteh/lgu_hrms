import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const idParam = z.object({ id: z.string().min(1) });

// CSC-DBM JC No. 2 s. 2015 constraints: overtime services are billable in
// whole/half hours with a minimum of 2 renderable hours, rate multipliers
// 125% (scheduled workday) / 150% (rest day, holiday, special non-working day).
export const createOvertimeSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    date: dateField,
    startHm: z.string().regex(/^\d{1,2}:\d{2}$/, 'Expected HH:MM').optional(),
    endHm: z.string().regex(/^\d{1,2}:\d{2}$/, 'Expected HH:MM').optional(),
    hours: z.number().min(2).max(16),
    type: z.enum(['WORKDAY', 'REST_DAY', 'HOLIDAY']).default('WORKDAY'),
    notes: z.string().max(255).optional().nullable(),
  }),
};

export const updateOvertimeSchema = {
  params: idParam,
  body: z.object({
    hours: z.number().min(2).max(16).optional(),
    type: z.enum(['WORKDAY', 'REST_DAY', 'HOLIDAY']).optional(),
    notes: z.string().max(255).optional().nullable(),
  }),
};

export const approveOvertimeSchema = {
  params: idParam,
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    notes: z.string().max(255).optional().nullable(),
  }),
};

export const overtimeIdSchema = {
  params: idParam,
};

export const listOvertimeSchema = {
  query: z.object({
    employeeId: z.string().min(1).optional(),
    date: dateField.optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM').optional(),
  }),
};