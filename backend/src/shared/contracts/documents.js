import { z } from 'zod';

export const documentTypeSchema = z.enum([
  'OFFICE_ORDER', 'POLICY', 'MSB_CONSTITUTION', 'LD_PLAN', 'MINUTES',
  'RESOLUTION', 'MEMO', 'AGREEMENT_MOA', 'SERVICE_RECORD', 'PAYSLIP', 'OTHER',
]);

export const documentStatusSchema = z.enum([
  'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED',
]);

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const createDocumentSchema = {
  body: z.object({
    title: z.string().min(1).max(200),
    type: documentTypeSchema,
    description: z.string().max(2000).optional().nullable(),
    version: z.string().max(50).optional().nullable(),
    effectiveDate: dateField.optional().nullable(),
    tags: z.array(z.string().max(50)).optional(),
    relatedEmployeeId: z.string().uuid().optional().nullable(),
    retentionClass: z.string().max(100).optional().nullable(),
    seriesCode: z.string().max(50).optional().nullable(),
  }),
};

export const updateDocumentSchema = {
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    type: documentTypeSchema.optional(),
    description: z.string().max(2000).optional().nullable(),
    version: z.string().max(50).optional().nullable(),
    effectiveDate: dateField.optional().nullable(),
    tags: z.array(z.string().max(50)).optional(),
    relatedEmployeeId: z.string().uuid().optional().nullable(),
    retentionClass: z.string().max(100).optional().nullable(),
    seriesCode: z.string().max(50).optional().nullable(),
  }),
};

export const listDocumentsSchema = {
  query: z.object({
    type: documentTypeSchema.optional(),
    status: documentStatusSchema.optional(),
    tags: z.array(z.string().max(50)).optional(),
    employeeId: z.string().uuid().optional(),
    search: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }),
};

export const documentIdSchema = {
  params: z.object({ id: z.string().uuid() }),
};

export const documentAccessActionSchema = z.enum(['VIEWED', 'DOWNLOADED', 'PRINTED', 'EXPORTED']);

export const listDocumentAccessSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
    documentId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    action: documentAccessActionSchema.optional(),
    from: dateField.optional(),
    to: dateField.optional(),
  }),
};

export const listDocumentAccessExportSchema = {
  query: z.object({
    documentId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    action: documentAccessActionSchema.optional(),
    from: dateField.optional(),
    to: dateField.optional(),
  }),
};

export const documentIdStatusSchema = {
  params: z.object({ id: z.string().uuid(), status: documentStatusSchema }),
};

export const workflowSchema = {
  query: z.object({}),
};
