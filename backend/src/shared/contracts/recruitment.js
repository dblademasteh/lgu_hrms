import { z } from 'zod';

const idField = z.string().min(1);
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const applicantStatus = z.enum(['NEW', 'APPLIED', 'SCREENED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED', 'DISQUALIFIED']);
const applicantCreateStatus = z.enum(['NEW', 'APPLIED', 'SCREENED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'REJECTED', 'DISQUALIFIED']);

export const listApplicantsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    search: z.string().optional(),
    status: applicantStatus.optional(),
  }),
};

export const createApplicantSchema = {
  body: z.object({
    firstName: z.string().min(1).max(120),
    lastName: z.string().min(1).max(120),
    middleName: z.string().max(120).optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    appliedPositionId: z.string().optional().nullable(),
    appliedDepartmentId: z.string().optional().nullable(),
    vacancyId: z.string().optional().nullable(),
    status: applicantCreateStatus.default('NEW'),
    resumeUrl: z.string().max(500).optional().nullable(),
  }),
};

export const updateApplicantSchema = {
  params: z.object({ id: idField }),
  body: z.object({
    firstName: z.string().min(1).max(120).optional(),
    lastName: z.string().min(1).max(120).optional(),
    middleName: z.string().max(120).optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(30).optional().nullable(),
    appliedPositionId: z.string().optional().nullable(),
    appliedDepartmentId: z.string().optional().nullable(),
    vacancyId: z.string().optional().nullable(),
    status: applicantStatus.optional(),
    eligibilityScore: z.coerce.number().int().min(0).optional(),
    screeningScore: z.coerce.number().int().min(0).optional(),
    interviewScore: z.coerce.number().int().min(0).optional(),
    selectionBoardNotes: z.string().max(5000).optional().nullable(),
    hiredEmployeeId: z.string().optional().nullable(),
    resumeUrl: z.string().max(500).optional().nullable(),
  }),
};

export const hireApplicantSchema = {
  params: z.object({ id: idField }),
  body: z.object({
    birthDate: dateField.optional(),
    gender: z.enum(['Male', 'Female', 'OTHER']).optional(),
    civilStatus: z.enum(['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED', 'OTHER']).optional(),
    address: z.string().max(500).optional().nullable(),
    contactNumber: z.string().max(30).optional().nullable(),
    email: z.string().email().optional().nullable(),
    monthlySalary: z.coerce.number().min(0).optional(),
    employeeNumber: z.string().optional(),
    appointmentType: z.enum(['PERMANENT', 'TEMPORARY', 'CONTRACTUAL', 'CASUAL', 'JOB_ORDER']).optional().default('PERMANENT'),
    itemNumber: z.string().optional().nullable(),
    startDate: dateField.optional(),
  }),
};

export const listEligibilitiesSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    employeeId: z.string().optional(),
  }),
};

export const createEligibilitySchema = {
  body: z.object({
    employeeId: z.string().min(1),
    eligibilityType: z.enum(['CSC', 'PRC', 'BAR', 'OTHER']),
    rating: z.string().max(50).optional().nullable(),
    examDate: dateField.optional().nullable(),
    validUntil: dateField.optional().nullable(),
    remarks: z.string().max(500).optional().nullable(),
  }),
};
