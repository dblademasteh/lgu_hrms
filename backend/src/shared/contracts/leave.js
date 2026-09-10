import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const idParam = z.object({ id: z.string().min(1) });
const leaveType = z.enum(['VACATION', 'SICK', 'MATERNITY', 'PATERNITY', 'SOLO_PARENT', 'STUDY', 'EMERGENCY', 'SPECIAL']);

export const createLeaveRequestSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    type: leaveType,
    fromDate: dateField,
    toDate: dateField,
    days: z.number().positive().max(365),
    reason: z.string().max(500).optional().nullable(),
  }),
};

export const updateLeaveRequestSchema = {
  params: idParam,
  body: z.object({
    status: z.enum(['PENDING', 'APPROVED', 'DENIED', 'CANCELLED']),
    reason: z.string().max(500).optional().nullable(),
  }),
};

export const leaveRequestIdSchema = {
  params: idParam,
};
