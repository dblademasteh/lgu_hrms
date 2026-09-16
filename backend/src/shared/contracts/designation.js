import { z } from 'zod';

const idField = z.string().min(1);
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const listDesignationSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    employeeId: z.string().optional(),
  }),
};

export const getDesignationSchema = {
  params: z.object({ id: idField }),
};

export const createDesignationSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    appointmentId: z.string().optional().nullable(),
    vacancyId: z.string().optional().nullable(),
    orderNumber: z.string().min(1).max(120),
    issuedDate: dateField,
    effectiveDate: dateField.optional().nullable(),
    expirationDate: dateField.optional().nullable(),
    signedBy: z.string().max(120).optional().nullable(),
    approvedBy: z.string().max(120).optional().nullable(),
    recommendedBy: z.string().max(120).optional().nullable(),
    status: z.enum(['DRAFT', 'RECOMMENDED', 'APPROVED', 'ISSUED', 'EFFECTIVE', 'REVOKED']).default('DRAFT'),
    documentUrl: z.string().max(500).optional().nullable(),
    remarks: z.string().max(5000).optional().nullable(),
  }),
};

export const updateDesignationSchema = {
  params: z.object({ id: idField }),
  body: createDesignationSchema.body.partial(),
};

export const deleteDesignationSchema = {
  params: z.object({ id: idField }),
};
