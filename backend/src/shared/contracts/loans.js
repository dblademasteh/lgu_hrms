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
    // Mirrors the Prisma LoanType enum exactly — a drift here made every
    // loan creation 400 with VALIDATION_ERROR.
    type: z.enum(['SALARY_ADVANCE', 'CASH_LOAN', 'HOUSING_LOAN', 'EDUCATION_LOAN']),
    amount: z.coerce.number().min(0.01),
    termMonths: z.coerce.number().int().min(1),
    startDate: z.string().min(1),
  }),
};
