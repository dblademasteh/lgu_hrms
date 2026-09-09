import * as repo from '../repositories/trainingRepository.js';
export const listPrograms = repo.findPrograms;
export const getProgram = repo.findProgramById;
export const createProgram = repo.createProgram;
export const updateProgram = repo.updateProgram;
export const deleteProgram = repo.deleteProgram;
export const listEnrollments = repo.findEnrollments;
export const createEnrollment = repo.createEnrollment;
