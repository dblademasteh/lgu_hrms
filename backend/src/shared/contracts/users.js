import { z } from 'zod';

export const createUserSchema = {
  body: z.object({
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/, 'Letters, digits, dot, dash, underscore only'),
    role: z.enum(['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD', 'AUDITOR']),
    departmentId: z.string().min(1).optional().nullable(),
    displayName: z.string().max(100).optional().nullable(),
    email: z.string().email().optional().nullable(),
    contactNumber: z.string().max(30).optional().nullable(),
    externalId: z.string().min(1).max(50).optional().nullable(),
  }),
};

export const updateUserSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: createUserSchema.body.partial(),
};

export const userIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};
