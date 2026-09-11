import * as repo from '../repositories/recruitmentRepository.js';
export const listApplicants = (req, params) => repo.findApplicants(req, params);
export const createApplicant = (req, data) => repo.createApplicant(req, data);
export const updateApplicant = (req, id, data) => repo.updateApplicant(req, id, data);
export const listEligibilities = (req, params) => repo.findEligibilities(req, params);
export const createEligibility = (req, data) => repo.createEligibility(req, data);
