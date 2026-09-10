import { z } from 'zod';

const idParam = z.object({ id: z.string().min(1) });
const bonusType = z.enum(['THIRTEENTH_MONTH', 'CASH_GIFT', 'YEAR_END_BONUS']);

export const createBonusSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    type: bonusType,
    amount: z.number().positive('Amount must be positive').max(9999999999.99),
    periodYear: z.number().int().min(2000).max(2100),
    periodMonth: z.number().int().min(1).max(12).optional().nullable(),
  }),
};

export const updateBonusSchema = {
  params: idParam,
  body: createBonusSchema.body.partial(),
};

export const bonusIdSchema = {
  params: idParam,
};
