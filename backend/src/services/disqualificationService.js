import { disqualificationRepository } from '../repositories/disqualificationRepository.js';

export const disqualificationService = {
  async getAll(req, options = {}) {
    const { status, type, reason, page = 1, limit = 50, search } = options;
    return disqualificationRepository.findAll(req, { status, type, reason, page, limit, search });
  },

  async getById(req, id) {
    return disqualificationRepository.findById(req, id);
  },

  async create(req, data, userId) {
    return disqualificationRepository.create(req, { ...data, createdBy: userId });
  },

  async update(req, id, data) {
    return disqualificationRepository.update(req, id, data);
  },

  async delete(req, id) {
    return disqualificationRepository.remove(req, id);
  },

  async getDibarReport(req, options = {}) {
    const { dateFrom, dateTo, type, reason, isBarred } = options;
    return disqualificationRepository.findReport(req, { dateFrom, dateTo, type, reason, isBarred });
  },

  async getActiveDisqualifications(req) {
    return disqualificationRepository.findActive(req);
  },
};
