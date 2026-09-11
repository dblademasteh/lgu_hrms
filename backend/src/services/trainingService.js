import * as repo from '../repositories/trainingRepository.js';
export const listPrograms = (req, params) => repo.findPrograms(req, params);
export const getProgram = (req, id) => repo.findProgramById(req, id);
export const createProgram = (req, data) => repo.createProgram(req, data);
export const updateProgram = (req, id, data) => repo.updateProgram(req, id, data);
export const deleteProgram = (req, id) => repo.deleteProgram(req, id);
export const listEnrollments = (req, params) => repo.findEnrollments(req, params);
export const createEnrollment = (req, data) => repo.createEnrollment(req, data);
