import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD').optional().nullable();

export const createDepartmentSchema = {
  body: z.object({
    code: z.string().min(1).max(20),
    name: z.string().min(1).max(120),
    parentId: z.string().optional().nullable(),
    unitType: z.enum(['DEPARTMENT', 'DIVISION', 'SECTION']).default('DEPARTMENT'),
    isMandatory: z.boolean().default(false),
    isOptional: z.boolean().default(false),
    isHrmOffice: z.boolean().default(false),
    headTitle: z.string().optional().nullable(),
    sanggunianConcurrence: z.boolean().default(false),
    concurrenceDate: dateField,
    concurrenceResolution: z.string().optional().nullable(),
    cscSubmissionDate: dateField,
    remarks: z.string().optional().nullable(),
  }),
};

export const updateDepartmentSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    code: z.string().min(1).max(20).optional(),
    name: z.string().min(1).max(120).optional(),
    parentId: z.string().optional().nullable(),
    unitType: z.enum(['DEPARTMENT', 'DIVISION', 'SECTION']).optional(),
    isMandatory: z.boolean().optional(),
    isOptional: z.boolean().optional(),
    isHrmOffice: z.boolean().optional(),
    headTitle: z.string().optional().nullable(),
    sanggunianConcurrence: z.boolean().optional(),
    concurrenceDate: dateField,
    concurrenceResolution: z.string().optional().nullable(),
    cscSubmissionDate: dateField,
    remarks: z.string().optional().nullable(),
  }).refine(o => Object.keys(o).length > 0, { message: 'No updatable fields provided' }),
};

export const departmentIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};
