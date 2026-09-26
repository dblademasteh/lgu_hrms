import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

// Reject out-of-range clock components (e.g. "25:99" would silently roll into
// the next day via manilaTimeOnDate if left unchecked). Works for both the
// bare HH:MM form and the ISO-8601 datetime form.
function validClock(isoOrHm) {
  const timePart = isoOrHm.includes('T') ? isoOrHm.split('T')[1] : isoOrHm;
  const m = timePart.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return true;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour <= 23 && minute <= 59;
}

// ISO-8601 datetime or a bare HH:MM(:ss) local time (interpreted on the record
// date in Asia/Manila by the service).
const timeField = z
  .string()
  .regex(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?|\d{1,2}:\d{2}(:\d{2})?)$/,
    'Expected ISO-8601 datetime or HH:MM',
  )
  .refine(validClock, 'Invalid hour/minute');

export const listAttendanceSchema = {
  query: z.object({
    date: dateField.optional(),
  }),
};

export const myAttendanceSchema = {
  query: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM').optional(),
  }),
};

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
    // Required when BIOMETRIC_PUNCH_KEY is configured on the server.
    punchKey: z.string().optional(),
  }),
};

export const integrationsAttendancePunchSchema = {
  body: z.object({
    employeeNumber: z.string().min(1),
    punchType: z.enum(['IN', 'OUT']).optional(),
    at: z.string().datetime().optional(),
    deviceId: z.string().optional(),
    source: z.string().optional(),
  }),
};

export const integrationsAttendanceBulkSchema = {
  body: z.object({
    records: z.array(z.object({
      employeeNumber: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
      timeIn: z.string().optional().nullable(),
      timeOut: z.string().optional().nullable(),
      hours: z.number().min(0).max(24).optional().nullable(),
      remark: z.string().max(255).optional().nullable(),
      source: z.string().optional(),
    })).min(1).max(1000),
  }),
};

export const integrationsAttendanceListSchema = {
  query: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
    employeeNumber: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
};
