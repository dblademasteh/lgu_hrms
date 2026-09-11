import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    // 1. Add tenantId column (idempotent)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Vacancy_tenantId_idx" ON "Vacancy" ("tenantId");`);
    console.log('Column added');

    // 2. Backfill existing vacancies to the default tenant
    const res = await prisma.$executeRawUnsafe(`UPDATE "Vacancy" SET "tenantId" = 'tenant-default' WHERE "tenantId" IS NULL;`);
    console.log(`Backfilled rows:`, res.count ?? res.rowCount ?? 'n/a');

    // 3. Verify
    const cols = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Vacancy' AND column_name = 'tenantId';`);
    const cnt = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "Vacancy" WHERE "tenantId" = 'tenant-default';`);
    console.log('tenantId present:', cols.length > 0);
    console.log('Vacancy rows scoped to tenant-default:', cnt[0]?.n);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
