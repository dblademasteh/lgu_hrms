import { z } from 'zod';

const itemParam = z.object({ itemId: z.string().min(1) });

const deductionLine = z.object({
  code: z.string().min(1).max(50),
  description: z.string().max(255).optional().nullable(),
  employeeShare: z.number().min(0).max(9999999999.99).default(0),
  employerShare: z.number().min(0).max(9999999999.99).default(0),
});

export const addDeductionLinesSchema = {
  params: itemParam,
  body: z.object({
    lines: z.array(deductionLine).min(1).max(50),
  }),
};

export const upsertPayslipSchema = {
  params: itemParam,
  body: z.object({
    pdfUrl: z.string().max(500).optional().nullable(),
  }),
};

export const deductionItemSchema = {
  params: itemParam,
};
