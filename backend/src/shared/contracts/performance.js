import { z } from 'zod';

const outputGroupEnum = z.enum(['CORE', 'STRATEGIC', 'SUPPORT']);

export const createPerformanceSchema = {
  body: z.object({
    employeeId: z.string().min(1),
    reviewYear: z.number().int().min(1900).max(2100),
    reviewType: z.enum(['IPCR', 'OPCR']),
    periodStart: z.string().optional().nullable(),
    periodEnd: z.string().optional().nullable(),
    planningDate: z.string().optional().nullable(),
    coreWeight: z.number().min(0).max(100).optional(),
    strategicWeight: z.number().min(0).max(100).optional(),
    supportWeight: z.number().min(0).max(100).optional(),
    competencyWeight: z.number().min(0).max(100).optional(),
    officeRatingCap: z.number().min(1).max(5).optional().nullable(),
    parentReviewId: z.string().optional().nullable(),
    comments: z.string().max(5000).optional().nullable(),
    status: z.enum(['PLANNING', 'MONITORING', 'REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  }),
};

export const updatePerformanceSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: createPerformanceSchema.body.partial(),
};

export const performanceIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};

export const createTargetSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    kra: z.string().min(1).max(200),
    successIndicator: z.string().min(1).max(2000),
    outputGroup: outputGroupEnum.optional(),
    weight: z.number().min(0).max(100),
    targetQuantity: z.number().optional().nullable(),
    targetUnit: z.string().max(50).optional().nullable(),
    q1Actual: z.string().max(2000).optional().nullable(),
    q2Actual: z.string().max(2000).optional().nullable(),
    q3Actual: z.string().max(2000).optional().nullable(),
    q4Actual: z.string().max(2000).optional().nullable(),
    annualActual: z.string().max(2000).optional().nullable(),
    qualityScore: z.number().min(1).max(5).optional().nullable(),
    efficiencyScore: z.number().min(1).max(5).optional().nullable(),
    timelinessScore: z.number().min(1).max(5).optional().nullable(),
    meansOfVerification: z.string().max(2000).optional().nullable(),
    remarks: z.string().max(2000).optional().nullable(),
  }),
};

export const updateTargetSchema = {
  params: z.object({ id: z.string().min(1), targetId: z.string().min(1) }),
  body: createTargetSchema.body.partial(),
};

export const targetIdSchema = {
  params: z.object({ id: z.string().min(1), targetId: z.string().min(1) }),
};

export const batchUpdateTargetsSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    targets: z.array(z.object({
      id: z.string().optional(),
      kra: z.string().min(1).max(200),
      successIndicator: z.string().min(1).max(2000),
      outputGroup: outputGroupEnum.optional(),
      weight: z.number().min(0).max(100),
      targetQuantity: z.number().optional().nullable(),
      targetUnit: z.string().max(50).optional().nullable(),
      q1Actual: z.string().max(2000).optional().nullable(),
      q2Actual: z.string().max(2000).optional().nullable(),
      q3Actual: z.string().max(2000).optional().nullable(),
      q4Actual: z.string().max(2000).optional().nullable(),
      annualActual: z.string().max(2000).optional().nullable(),
      qualityScore: z.number().min(1).max(5).optional().nullable(),
      efficiencyScore: z.number().min(1).max(5).optional().nullable(),
      timelinessScore: z.number().min(1).max(5).optional().nullable(),
      meansOfVerification: z.string().max(2000).optional().nullable(),
      remarks: z.string().max(2000).optional().nullable(),
    })).min(1),
  }),
};

export const computeRatingSchema = {
  params: z.object({ id: z.string().min(1) }),
};

export const createCompetencySchema = {
  body: z.object({
    code: z.string().min(1).max(50),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional().nullable(),
  }),
};

export const updateCompetencySchema = {
  params: z.object({ id: z.string().min(1) }),
  body: createCompetencySchema.body.partial(),
};

export const competencyIdSchema = {
  params: z.object({ id: z.string().min(1) }),
};

export const createReviewCompetencySchema = {
  body: z.object({
    competencyId: z.string().min(1),
    score: z.number().min(1).max(5).optional().nullable(),
    maxScore: z.number().min(1).max(100).optional(),
    weight: z.number().min(0).max(100).optional(),
    comments: z.string().max(2000).optional().nullable(),
  }),
};

export const updateReviewCompetencySchema = {
  params: z.object({ itemId: z.string().min(1) }),
  body: createReviewCompetencySchema.body.partial(),
};
