import { z } from 'zod';

export const enrollBiometricSchema = {
  body: z.object({
    deviceName: z.string().max(255).optional().nullable(),
  }),
};

export const verifyBiometricSchema = {
  body: z.object({
    credentialId: z.string().min(1),
    assertion: z.string().min(1),
    punchType: z.enum(['IN', 'OUT']).optional(),
  }),
};

export const listBiometricSchema = {
  query: z.object({}),
};
