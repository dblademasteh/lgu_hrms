import { prisma } from '../lib/prisma.js';

export const appointmentsRepository = {
  async findAll() {
    return prisma.appointment.findMany({
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { startDate: 'desc' }
    });
  },
  async create(data) {
    return prisma.appointment.create({ data });
  },
  async update(id, data) {
    return prisma.appointment.update({ where: { id }, data });
  },
  async remove(id) {
    return prisma.appointment.delete({ where: { id } });
  }
};