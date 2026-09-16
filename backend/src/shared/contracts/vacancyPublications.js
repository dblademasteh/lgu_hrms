import { z } from 'zod';

const idField = z.string().min(1);

export const listVacancyPublicationsSchema = {
  query: z.object({
    vacancyId: z.string().optional(),
    channel: z.string().optional(),
  }),
};

export const createVacancyPublicationSchema = {
  body: z.object({
    vacancyId: z.string().min(1),
    channel: z.string().min(1).max(120),
    link: z.string().max(500).optional().nullable(),
    publishedBy: z.string().optional().nullable(),
  }),
};

export const deleteVacancyPublicationSchema = {
  params: z.object({ id: idField }),
};
