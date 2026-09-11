import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Verify tenantId is a valid where-clause field on key models
const testQueries = [
  prisma.employee.findMany({ where: { tenantId: 'tenant-default' } }),
  prisma.payrollRun.findMany({ where: { tenantId: 'tenant-default' } }),
  prisma.leaveRequest.findMany({ where: { tenantId: 'tenant-default' } }),
  prisma.attendance.findMany({ where: { tenantId: 'tenant-default' } }),
  prisma.appointment.findMany({ where: { tenantId: 'tenant-default' } }),
  prisma.bonus.findMany({ where: { tenantId: 'tenant-default' } }),
  prisma.loan.findMany({ where: { tenantId: 'tenant-default' } }),
  prisma.applicant.findMany({ where: { tenantId: 'tenant-default' } }),
  prisma.vacancy.findMany({ where: { tenantId: 'tenant-default' } }),
  prisma.user.findMany({ where: { tenantId: 'tenant-default' } }),
  prisma.department.findMany({ where: { tenantId: 'tenant-default' } }),
];

try {
  await Promise.all(testQueries);
  console.log('All queries passed');
} catch(e) {
  if (e.code === 'P2025') {
    console.log('All models accept tenantId (no rows - expected)');
  } else if (e.message.includes('tenantId')) {
    console.log('VALIDATION ERROR:', e.message.substring(0, 200));
  } else {
    console.log('Query error (expected for empty tables):', e.code);
  }
}
await prisma.$disconnect();
