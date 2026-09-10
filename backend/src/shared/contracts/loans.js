import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const loanType = z.enum(['SALARY_ADVANCE', 'CASH_LOAN', 'HOUSING_LOAN', 'EDUCATION_LOAN']);

export const createLoanSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    type: loanType,
    amount: z.number().positive('Amount must be positive').max(9999999999.99),
    termMonths: z.number().int().positive('Term must be a positive whole number of months').max(360),
    startDate: dateField,
  }),
};

export const loanIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};
