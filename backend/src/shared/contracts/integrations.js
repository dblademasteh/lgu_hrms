import { z } from 'zod';
import { SCOPE_NAMES, EVENT_NAMES, EXTERNAL_SYSTEM_TYPES } from '../integrationCatalog.js';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const scopeName = z.enum(SCOPE_NAMES);
const eventName = z.enum(EVENT_NAMES);
const systemType = z.enum(EXTERNAL_SYSTEM_TYPES);

export const createApiKeySchema = {
  body: z.object({
    name: z.string().min(1),
    scopes: z.array(scopeName).nonempty().optional(),
  }),
};

export const createWebhookSchema = {
  body: z.object({
    name: z.string().min(1),
    url: z.string().url(),
    events: z.array(eventName).min(1),
    secret: z.string().optional(),
  }),
};

export const updateWebhookSchema = {
  body: z.object({
    name: z.string().min(1).optional(),
    url: z.string().url().optional(),
    events: z.array(eventName).min(1).optional(),
    isActive: z.boolean().optional(),
  }),
};

export const createExternalSystemSchema = {
  body: z.object({
    name: z.string().min(1),
    type: systemType,
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
    type: systemType.optional(),
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

export const integrationsLeaveRequestsQuerySchema = {
  query: z.object({
    startDate: dateField.optional(),
    endDate: dateField.optional(),
    employeeNumber: z.string().min(1).optional(),
    status: z.enum(['PENDING', 'APPROVED', 'DENIED', 'CANCELLED', 'RECOMMENDED']).optional(),
    type: z.enum(['VACATION', 'SICK', 'SPECIAL_PRIVILEGE', 'MATERNITY', 'PATERNITY', 'SOLO_PARENT', 'SPECIAL_WOMEN', 'COMPENSATORY']).optional(),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(50),
  }),
};

export const integrationsLeaveCreditsQuerySchema = {
  query: z.object({
    employeeNumber: z.string().min(1).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(100),
  }),
};

export const integrationsPayrollRunsQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(50),
    status: z.string().optional(),
    periodId: z.string().optional(),
    runDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD').optional(),
  }),
};

export const integrationsPayrollRunIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};

export const integrationsPayrollPeriodsQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(50),
    status: z.string().optional(),
    fiscalYear: z.coerce.number().int().min(2000).max(2100).optional(),
  }),
};

export const integrationsPayslipsQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(50),
    runId: z.string().optional(),
    employeeNumber: z.string().optional(),
  }),
};

export const integrationsLoansQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(50),
    status: z.enum(['PENDING', 'APPROVED', 'DISBURSED', 'PAID', 'CANCELLED']).optional(),
    employeeNumber: z.string().min(1).optional(),
  }),
};
