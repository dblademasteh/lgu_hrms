import { prisma } from '../lib/prisma.js';

export const attendanceRepository = {
  async findAll(date) {
    return prisma.attendance.findMany({
      where: date ? { date: { gte: new Date(`${date}T00:00:00Z`), lt: new Date(`${date}T23:59:59Z`) } } : {},
      include: { employee: { select: { id: true, employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' }
    });
  },
  async create(data) {
    return prisma.attendance.create({ data });
  }
};