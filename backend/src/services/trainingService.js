import * as repo from '../repositories/trainingRepository.js';
export const listPrograms = (req, params) => repo.findPrograms(req, params);
export const getProgram = (req, id) => repo.findProgramById(req, id);
export const createProgram = (req, data) => repo.createProgram(req, data);
export const updateProgram = (req, id, data) => repo.updateProgram(req, id, data);
export const deleteProgram = (req, id) => repo.deleteProgram(req, id);
export const listEnrollments = (req, params) => repo.findEnrollments(req, params);

export async function createEnrollment(req, data) {
  const dup = await repo.findEnrollmentDuplicate(req, { programId: data.programId, employeeId: data.employeeId });
  if (dup) { const e = new Error('Enrollment already exists for this employee and program'); e.status = 409; e.code = 'DUPLICATE'; throw e; }
  return repo.createEnrollment(req, data);
}

const ENROLLMENT_TRANSITIONS = {
  ENROLLED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export async function updateEnrollment(req, id, data) {
  const existing = await repo.findEnrollmentById(req, id);
  if (!existing) { const e = new Error('Enrollment not found'); e.status = 404; throw e; }
  const allowed = ENROLLMENT_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(data.status)) { const e = new Error(`Cannot transition from ${existing.status} to ${data.status}`); e.status = 422; e.code = 'INVALID_TRANSITION'; throw e; }
  const patch = { status: data.status };
  if (data.status === 'COMPLETED') patch.completedAt = new Date();
  return repo.updateEnrollment(req, id, patch);
}

export async function deleteEnrollment(req, id) {
  const existing = await repo.findEnrollmentById(req, id);
  if (!existing) { const e = new Error('Enrollment not found'); e.status = 404; throw e; }
  return repo.deleteEnrollment(req, id);
}

export async function getEnrollment(req, id) { return repo.findEnrollmentById(req, id); }
