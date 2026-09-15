import { z } from 'zod';

const idField = z.string().min(1);
const hostField = z
  .string()
  .min(1, 'Host is required')
  .trim()
  .refine((v) => !/\s/.test(v), 'Host must be an IP or hostname without spaces');

const createDeviceSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  model: z.string().max(80).trim().optional().nullable(),
  protocol: z.enum(['ZK_TCP']).optional().default('ZK_TCP'),
  host: hostField,
  port: z.number().int().min(1).max(65535).optional().default(4370),
  serial: z.string().max(80).trim().optional().nullable(),
  active: z.boolean().optional().default(true),
  pollIntervalMs: z.number().int().min(5000).max(600000).optional().default(30000),
});

const updateDeviceSchema = createDeviceSchema.partial();

export const createBiometricDeviceSchema = { body: createDeviceSchema };
export const updateBiometricDeviceSchema = {
  body: updateDeviceSchema,
  params: z.object({ id: idField }),
};
export const getBiometricDeviceSchema = { params: z.object({ id: idField }) };
export const syncBiometricDeviceSchema = { params: z.object({ id: idField }) };
export const deleteBiometricDeviceSchema = { params: z.object({ id: idField }) };

export const injectDeviceEventsSchema = {
  body: z.object({
    employeeNumber: z.string().min(1),
    // ISO / YYYY-MM-DDTHH:mm timestamps; the first opens the day, the second
    // closes it, etc. (multi-punch semantics shared with the kiosk).
    events: z.array(z.string().min(1)).min(1).max(50),
  }),
};