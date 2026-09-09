import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    displayName: z.string().max(100).optional(),
    email: z.string().email().optional(),
    displayPrefs: z.record(z.any()).optional(),
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/),
  })
});

export const setup2FASchema = z.object({
  body: z.object({ code: z.string().length(6) })
});

export const revokeSessionSchema = z.object({
  params: z.object({ id: z.string() })
});

export const delegationSchema = z.object({
  body: z.object({
    delegateeId: z.string().uuid(),
    scope: z.string().max(200).optional(),
    reason: z.string().max(500).optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  })
});
