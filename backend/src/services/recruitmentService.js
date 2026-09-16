import * as repo from '../repositories/recruitmentRepository.js';
export const listApplicants = (req, params) => repo.findApplicants(req, params);
export const createApplicant = (req, data) => repo.createApplicant(req, data);
export const updateApplicant = (req, id, data) => {
  if (data.status === 'HIRED' || data.hiredEmployeeId !== undefined) {
    const e = new Error('Marking as hired goes through the hire endpoint');
    e.status = 400;
    e.code = 'USE_HIRE_ENDPOINT';
    throw e;
  }
  return repo.updateApplicant(req, id, data);
};
export const hireApplicant = (req, id, data) => repo.hireApplicant(req, id, data);
export const listEligibilities = (req, params) => repo.findEligibilities(req, params);
export const createEligibility = (req, data) => repo.createEligibility(req, data);
