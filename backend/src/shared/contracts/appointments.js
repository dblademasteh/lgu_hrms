import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const appointmentType = z.enum(['PERMANENT', 'TEMPORARY', 'CASUAL', 'CONTRACTUAL', 'JOB_ORDER', 'COS', 'COTERMINOUS']);

export const createAppointmentSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    type: appointmentType,
    itemNo: z.string().min(1).max(60),
    startDate: dateField,
    endDate: dateField.optional().nullable(),
    status: z.enum(['ACTIVE', 'ENDED']).default('ACTIVE'),
  }),
};

export const updateAppointmentSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      type: appointmentType,
      itemNo: z.string().min(1).max(60),
      startDate: dateField,
      endDate: dateField.optional().nullable(),
      status: z.enum(['ACTIVE', 'ENDED']),
    })
    .partial(),
};

export const appointmentIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};
