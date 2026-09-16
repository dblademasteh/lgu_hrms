import { z } from 'zod';

const idField = z.string().min(1);

export const listProgramsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    search: z.string().optional(),
  }),
};

export const getProgramSchema = {
  params: z.object({ id: idField }),
};

export const createProgramSchema = {
  body: z.object({
    code: z.string().min(1).max(120),
    title: z.string().min(1).max(255),
    description: z.string().max(5000).optional().nullable(),
    durationHours: z.coerce.number().int().min(0).optional().nullable(),
  }),
};

export const updateProgramSchema = {
  params: z.object({ id: idField }),
  body: createProgramSchema.body.partial(),
};

export const deleteProgramSchema = {
  params: z.object({ id: idField }),
};

export const listEnrollmentsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    employeeId: z.string().optional(),
    programId: z.string().optional(),
    status: z.string().optional(),
  }),
};

export const createEnrollmentSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    programId: z.string().min(1),
    status: z.enum(['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('ENROLLED'),
  }),
};
