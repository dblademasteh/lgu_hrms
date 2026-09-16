import { z } from 'zod';

const idField = z.string().min(1);

export const listInterviewsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    applicantId: z.string().optional(),
  }),
};

export const getInterviewSchema = {
  params: z.object({ id: idField }),
};

export const createInterviewSchema = {
  body: z.object({
    applicantId: z.string().min(1),
    scheduledAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/, 'Expected YYYY-MM-DD or ISO datetime'),
    status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).default('SCHEDULED'),
    notes: z.string().max(5000).optional().nullable(),
  }),
};

export const updateInterviewSchema = {
  params: z.object({ id: idField }),
  body: createInterviewSchema.body.partial(),
};

export const deleteInterviewSchema = {
  params: z.object({ id: idField }),
};
