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

export const updateAttendanceSchema = {
  body: z.object({
    timeIn: timeField.optional().nullable(),
    timeOut: timeField.optional().nullable(),
    hours: z.number().min(0).max(24).optional().nullable(),
    remark: z.string().max(255).optional().nullable(),
  }),
};

export const deleteAttendanceSchema = {
  params: z.object({ id: z.string().min(1) }),
};

export const bulkImportAttendanceSchema = {
  body: z.object({
    records: z.array(z.object({
      employeeNumber: z.string().min(1),
      date: dateField,
      timeIn: timeField.optional().nullable(),
      timeOut: timeField.optional().nullable(),
      hours: z.number().min(0).max(24).optional().nullable(),
      remark: z.string().max(255).optional().nullable(),
    })).min(1).max(1000),
  }),
};

export const punchBiometricSchema = {
  body: z.object({
    punchType: z.enum(['IN', 'OUT']),
  }),
};

export const punchBiometricPublicSchema = {
  body: z.object({
    employeeNumber: z.string().min(1),
    punchType: z.enum(['IN', 'OUT']),
    tenantCode: z.string().min(1).optional(),
    deviceId: z.string().optional(),
  }),
};
