import { z } from 'zod';

const idField = z.string().min(1);

export const listDelegationsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  }),
};

export const createDelegationSchema = {
  body: z.object({
    delegateeId: z.string().min(1),
    scope: z.string().min(1).max(255),
    startsAt: z.string().optional().nullable(),
    endsAt: z.string().optional().nullable(),
  }),
};

export const revokeDelegationSchema = {
  params: z.object({ id: idField }),
};
