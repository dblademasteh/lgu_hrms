import { z } from 'zod';

export const reportQuerySchema = {
  query: z.object({
    runId: z.string().optional(),
    periodId: z.string().optional(),
    format: z.enum(['json','csv','xlsx','pdf']).optional().default('json'),
  }).refine(data => data.runId || data.periodId, { message: 'runId or periodId required' }),
};

export const payrollSummarySchema = {
  query: z.object({
    runId: z.string().optional(),
    periodId: z.string().optional(),
  }),
};

export const serviceRecordSchema = {
  params: z.object({
    employeeId: z.string().min(1),
  }),
  query: z.object({
    format: z.enum(['json','pdf']).optional().default('json'),
  }),
};
