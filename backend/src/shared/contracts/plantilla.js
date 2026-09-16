import { z } from 'zod';

const idField = z.string().min(1);

export const listPlantillaSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    departmentId: z.string().optional(),
    status: z.enum(['VACANT', 'FILLED', 'FROZEN', 'ARCHIVED']).optional(),
    search: z.string().max(120).optional(),
  }),
};

export const getPlantillaSchema = {
  params: z.object({ id: idField }),
};

export const createPlantillaSchema = {
  body: z.object({
    itemNumber: z.string().min(1).max(120),
    positionId: z.string().min(1),
    departmentId: z.string().min(1),
    status: z.enum(['VACANT', 'FILLED', 'FROZEN', 'ARCHIVED']).default('VACANT'),
    isMandatory: z.boolean().optional().default(false),
    itemType: z.string().max(120).optional().nullable(),
    salaryGrade: z.string().max(20).optional().nullable(),
    step: z.string().max(20).optional().nullable(),
    sourceOfFund: z.string().max(120).optional().nullable(),
    appropriationCode: z.string().max(120).optional().nullable(),
    authorizedSalary: z.coerce.number().min(0).optional().nullable(),
  }),
};

export const updatePlantillaSchema = {
  params: z.object({ id: idField }),
  body: createPlantillaSchema.body.partial(),
};

export const deletePlantillaSchema = {
  params: z.object({ id: idField }),
};
