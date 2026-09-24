import { z } from 'zod';

export const createApiKeySchema = {
  body: z.object({
    name: z.string().min(1),
    scopes: z.array(z.string()).optional(),
  }),
};

export const createWebhookSchema = {
  body: z.object({
    name: z.string().min(1),
    url: z.string().url(),
    events: z.array(z.string()).min(1),
    secret: z.string().optional(),
  }),
};

export const updateWebhookSchema = {
  body: z.object({
    name: z.string().min(1).optional(),
    url: z.string().url().optional(),
    events: z.array(z.string()).min(1).optional(),
    isActive: z.boolean().optional(),
  }),
};

export const createExternalSystemSchema = {
  body: z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    description: z.string().optional(),
    baseUrl: z.string().min(1),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    headers: z.string().optional(),
    syncDirection: z.string().optional(),
    attendanceMode: z.string().optional(),
    attendancePollInterval: z.number().int().min(0).optional(),
    deviceId: z.string().optional(),
    punchKey: z.string().optional(),
  }),
};

export const updateExternalSystemSchema = {
  body: z.object({
    name: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    description: z.string().optional(),
    baseUrl: z.string().min(1).optional(),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    headers: z.string().optional(),
    syncDirection: z.string().optional(),
    isActive: z.boolean().optional(),
    attendanceMode: z.string().optional(),
    attendancePollInterval: z.number().int().min(0).optional(),
    deviceId: z.string().optional(),
    punchKey: z.string().optional(),
  }),
};
