import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Tenants:');
    console.log(JSON.stringify(await prisma.$queryRawUnsafe('SELECT id, code, name FROM "Tenant"'), null, 2));
    console.log('Vacancy columns:');
    console.log(JSON.stringify(await prisma.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Vacancy' ORDER BY ordinal_position`), null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
