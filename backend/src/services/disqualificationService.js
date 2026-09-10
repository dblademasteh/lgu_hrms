import { prisma } from '../lib/prisma.js';

export const disqualificationService = {
  async getAll(options = {}) {
    const { status, type, reason, page = 1, limit = 50, search } = options;
    const where = {};
    
    if (status) where.isBarred = status === 'BARRED';
    if (type) where.type = type;
    if (reason) where.reason = reason;
    if (search) {
      where.OR = [
        { employee: { firstName: { contains: search, mode: 'insensitive' } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' } } },
        { employee: { employeeNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }
    
    const [records, total] = await Promise.all([
      prisma.disqualification.findMany({
        where,
        include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true, status: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' }
      }),
      prisma.disqualification.count({ where })
    ]);
    
    return { records, total, page, limit };
  },

  async getById(id) {
    return prisma.disqualification.findUnique({
      where: { id },
      include: { employee: true }
    });
  },

  async create(data, userId) {
    return prisma.disqualification.create({
      data: {
        ...data,
        createdBy: userId
      }
    });
  },

  async update(id, data) {
    return prisma.disqualification.update({
      where: { id },
      data
    });
  },

  async delete(id) {
    return prisma.disqualification.delete({ where: { id } });
  },

  // Get DIBAR report for CSC Form No. 8
  async getDibarReport(options = {}) {
    const { dateFrom, dateTo, type, reason, isBarred } = options;
    const where = {};
    
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    if (type) where.type = type;
    if (reason) where.reason = reason;
    if (isBarred !== undefined) where.isBarred = isBarred;
    
    const records = await prisma.disqualification.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            middleName: true,
            employeeNumber: true,
            department: { select: { name: true } },
            position: { select: { title: true } }
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    return records;
  },

  // Get active disqualifications (not expired)
  async getActiveDisqualifications() {
    const now = new Date();
    return prisma.disqualification.findMany({
      where: {
        OR: [
          { validity: null }, // No expiry
          { validity: { gt: now } } // Not yet expired
        ]
      },
      include: { employee: true }
    });
  }
};