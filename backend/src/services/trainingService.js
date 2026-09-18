import * as repo from '../repositories/trainingRepository.js';
export const listPrograms = (req, params) => repo.findPrograms(req, params);
export const getProgram = (req, id) => repo.findProgramById(req, id);
export const createProgram = (req, data) => repo.createProgram(req, data);
export const updateProgram = (req, id, data) => repo.updateProgram(req, id, data);
export const deleteProgram = (req, id) => {
  // TrainingEnrollment FK is ON DELETE RESTRICT — deleting a program with
  // enrollments would surface a raw Prisma FK error as a 500. Enrollments are
  // historical records: block the delete (409) until they are removed.
  return (async () => {
    const enrollmentCount = await repo.countEnrollmentsByProgram(req, id);
    if (enrollmentCount > 0) {
      const e = new Error(`Cannot delete this program while it has ${enrollmentCount} enrollment${enrollmentCount === 1 ? '' : 's'}. Cancel or delete its enrollments first.`);
      e.status = 409;
      e.code = 'ENROLLMENTS_EXIST';
      throw e;
    }
    return repo.deleteProgram(req, id);
  })();
}
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
