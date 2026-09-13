import { z } from 'zod';

export const createPerformanceSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    reviewYear: z.number().int().min(1900).max(2100),
    reviewType: z.enum(['IPCR', 'OPCR', 'PDP', 'IDP']),
    rating: z.number().min(1).max(5).optional().nullable(),
    comments: z.string().max(5000).optional().nullable(),
    status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
  }),
};

export const updatePerformanceSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: createPerformanceSchema.body.partial(),
};

export const performanceIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};

export const createCompetencySchema = {
  body: z.object({
    code: z.string().min(1).max(50),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional().nullable(),
  }),
};

export const updateCompetencySchema = {
  params: z.object({ id: z.string().min(1) }),
  body: createCompetencySchema.body.partial(),
};

export const competencyIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};

export const createReviewCompetencySchema = {
  body: z.object({
    competencyId: z.string().min(1),
    score: z.number().min(0),
    maxScore: z.number().min(1).max(100).optional(),
    comments: z.string().max(2000).optional().nullable(),
  }),
};

export const updateReviewCompetencySchema = {
  params: z.object({ itemId: z.string().min(1) }),
  body: createReviewCompetencySchema.body.partial(),
};
