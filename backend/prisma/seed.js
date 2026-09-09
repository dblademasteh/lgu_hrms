import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_DEFAULT_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);

  const dept = await prisma.department.upsert({
    where: { code: 'PGO' },
    update: {},
    create: {
      code: 'PGO',
      name: "Governor's Office",
      level: 0,
    },
  });

  const roles = ['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD', 'AUDITOR'];
  for (const role of roles) {
    await prisma.user.upsert({
      where: { username: role.toLowerCase() },
      update: { passwordHash: hash },
      create: {
        username: role.toLowerCase(),
        passwordHash: hash,
        role,
        departmentId: dept.id,
      },
    });
  }

  console.log('Seed completed. Default password:', password);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
