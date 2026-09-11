import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(3),
    password: z.string().min(8)
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string()
  })
});

export const loginPinSchema = z.object({
  body: z.object({
    username: z.string().min(3),
    pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits')
  })
});

export const pinSetupSchema = z.object({
  body: z.object({
    pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits')
  })
});
