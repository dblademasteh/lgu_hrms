import { z } from 'zod';

const idField = z.string().min(1);

export const listLoansSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    employeeId: z.string().optional(),
    status: z.string().optional(),
  }),
};

export const loanIdSchema = {
  params: z.object({ id: idField }),
};

export const createLoanSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    type: z.enum(['SALARY', 'EMERGENCY', 'COOPERATIVE', 'OTHER']),
    amount: z.coerce.number().min(0.01),
    termMonths: z.coerce.number().int().min(1),
    startDate: z.string().min(1),
  }),
};
