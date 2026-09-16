import { z } from 'zod';

const WRITABLE_SECTIONS = ['eligibilities', 'family', 'education', 'awards', 'history'];
const READONLY_SECTIONS = ['appointments', 'leave', 'leaveCredits', 'attendance', 'payroll', 'performance', 'training', 'loans'];

export const SECTION_ENUM = [...WRITABLE_SECTIONS, ...READONLY_SECTIONS];

export const sectionParamSchema = {
  params: z.object({
    id: z.string().min(1),
    section: z.enum(SECTION_ENUM),
  }),
};

export const recordParamSchema = {
  params: sectionParamSchema.params.extend({ recordId: z.string().min(1) }),
};

// Loose structural validation for sub-record payloads: the per-section model
// differs (history references department/position, education has levels, ...),
// so we enforce that the body is a flat record of string/number/boolean/null
// values with sane caps instead of trusting raw JSON. Required-field rules
// remain enforced by employeeSectionService.
const fieldValue = z.union([z.string().max(8000), z.number().max(1e15), z.boolean(), z.null()]);

const recordBody = z.record(z.string().min(1).max(200), fieldValue);

export const createSectionBodySchema = { body: recordBody };
export const updateSectionBodySchema = { body: recordBody };