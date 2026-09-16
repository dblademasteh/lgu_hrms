import { z } from 'zod';

const idField = z.string().min(1);
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const dateTimeField = z.string().regex(/^\d{4}-\d{2}-\d{2}(T[0-9:.Z+\-]+)?$/, 'Expected YYYY-MM-DD or ISO datetime');
const vacancyStatus = z.enum(['DRAFT', 'PUBLISHED', 'OPEN', 'CLOSED', 'FILLED', 'CANCELLED']);

export const listVacancySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    status: vacancyStatus.optional(),
    departmentId: z.string().optional(),
  }),
};

export const getVacancySchema = {
  params: z.object({ id: idField }),
};

export const createVacancySchema = {
  body: z.object({
    plantillaItemId: z.string().min(1),
    title: z.string().min(1).max(255),
    description: z.string().max(5000).optional().nullable(),
    qualifications: z.string().max(5000).optional().nullable(),
    eligibilityRequirements: z.string().max(5000).optional().nullable(),
    screeningCriteria: z.string().max(5000).optional().nullable(),
    status: vacancyStatus.default('DRAFT'),
    publishedAt: dateTimeField.optional().nullable(),
    approvedBy: z.string().optional().nullable(),
    publishedBy: z.string().optional().nullable(),
    closesAt: dateField.optional().nullable(),
  }),
};

export const updateVacancySchema = {
  params: z.object({ id: idField }),
  body: createVacancySchema.body.partial(),
};

export const deleteVacancySchema = {
  params: z.object({ id: idField }),
};
