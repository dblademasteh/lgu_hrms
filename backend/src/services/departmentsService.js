import { departmentsRepository } from '../repositories/departmentsRepository.js';

export const departmentsService = {
  async list() {
    return departmentsRepository.findAll();
  },
  async create(data) {
    return departmentsRepository.create(data);
  },
  async update(id, data) {
    return departmentsRepository.update(id, data);
  },
  async remove(id) {
    return departmentsRepository.remove(id);
  }
};