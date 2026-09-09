import { prisma } from '../lib/prisma.js';

export const departmentsRepository = {
  async findAll() {
    return prisma.department.findMany({
      orderBy: { code: 'asc' }
    });
  },
  async create(data) {
    return prisma.department.create({ data });
  },
  async update(id, data) {
    return prisma.department.update({ where: { id }, data });
  },
  async remove(id) {
    return prisma.department.delete({ where: { id } });
  }
};