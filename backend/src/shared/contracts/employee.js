import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const createEmployeeSchema = {
  body: z.object({
    employeeNumber: z.string().min(1).max(50),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    middleName: z.string().max(100).optional().nullable(),
    birthDate: dateField,
    gender: z.enum(['MALE', 'FEMALE']),
    civilStatus: z.enum(['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED', 'ANNULLED']),
    address: z.string().min(1).max(500),
    contactNumber: z.string().max(30).optional().nullable(),
    email: z.string().email().optional().nullable(),
    sssNumber: z.string().max(30).optional().nullable(),
    philhealthNumber: z.string().max(30).optional().nullable(),
    pagibigNumber: z.string().max(30).optional().nullable(),
    tinNumber: z.string().max(30).optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'RESIGNED', 'RETIRED']).default('ACTIVE'),
    departmentId: z.string().min(1),
    positionId: z.string().min(1),
    hiredDate: dateField,
    monthlySalary: z.coerce.number().min(0).max(99999999.99).optional(),
  }),
};

export const updateEmployeeSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: createEmployeeSchema.body.partial(),
};

export const employeeIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};

export const bulkEmployeesSchema = {
  body: z.array(createEmployeeSchema.body).min(1).max(1000),
};

export const listEmployeesSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    search: z.string().max(200).optional().nullable(),
    departmentId: z.string().min(1).optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'RESIGNED', 'RETIRED']).optional().nullable(),
  }),
};
