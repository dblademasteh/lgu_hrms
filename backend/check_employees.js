import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { tenantId: 'tenant-default' },
    select: { 
      employeeNumber: true, 
      firstName: true, 
      lastName: true, 
      department: { select: { name: true } },
      position: { select: { title: true } }
    },
    orderBy: { employeeNumber: 'asc' }
  });
  console.log(JSON.stringify(employees, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());