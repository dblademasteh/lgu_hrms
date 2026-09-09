import * as repo from '../repositories/recruitmentRepository.js';
export const listApplicants = repo.findApplicants;
export const createApplicant = repo.createApplicant;
export const updateApplicant = repo.updateApplicant;
export const listEligibilities = repo.findEligibilities;
export const createEligibility = repo.createEligibility;
