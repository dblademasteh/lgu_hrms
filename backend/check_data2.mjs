import { prisma } from './src/lib/prisma.js';

const users = await prisma.user.findMany({
  select: { username: true, role: true, tenantId: true, externalId: true }
});
console.log('Users:', JSON.stringify(users, null, 2));

const tenants = await prisma.tenant.findMany();
console.log('Tenants:', JSON.stringify(tenants, null, 2));

// Check employees
const employees = await prisma.employee.findMany({
  where: { tenantId: 'tenant-default' },
  select: { employeeNumber: true, firstName: true, lastName: true }
});
console.log('Employees (tenant-default):', JSON.stringify(employees, null, 2));

await prisma.$disconnect();