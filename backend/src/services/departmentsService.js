import { departmentsRepository } from '../repositories/departmentsRepository.js';

export const departmentsService = {
  async list(req) {
    return departmentsRepository.findAll(req);
  },
  async create(req, data) {
    return departmentsRepository.create(req, data);
  },
  async update(req, id, data) {
    return departmentsRepository.update(req, id, data);
  },
  async remove(req, id) {
    return departmentsRepository.remove(req, id);
  }
};