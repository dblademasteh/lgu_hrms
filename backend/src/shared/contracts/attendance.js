import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const timeField = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?$/, 'Expected ISO-8601 datetime');

export const createAttendanceSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    date: dateField,
    timeIn: timeField.optional().nullable(),
    timeOut: timeField.optional().nullable(),
    hours: z.number().min(0).max(24).optional().nullable(),
    remark: z.string().max(255).optional().nullable(),
  }),
};
