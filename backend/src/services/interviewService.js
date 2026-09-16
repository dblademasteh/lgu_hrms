import * as repo from '../repositories/interviewRepository.js';

export const interviewService = {
  list: (req, params) => repo.findInterviews(req, params),
  get: (req, id) => repo.findInterviewById(req, id),
  create: (req, data) => repo.createInterview(req, data),
  update: (req, id, data) => repo.updateInterview(req, id, data),
  delete: (req, id) => repo.deleteInterview(req, id),
};
