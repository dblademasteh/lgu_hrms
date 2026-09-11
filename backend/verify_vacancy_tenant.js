import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    // Test 1: withTenant scope on Vacancy (regular user path)
    // Simulate what vacancyRepository.findVacancies now does
    const scoped = await prisma.vacancy.findMany({
      where: { tenantId: 'tenant-default' },
      take: 5,
    });
    console.log('Scoped query (tenant-default):', JSON.stringify(scoped));

    // Test 2: cross-tenant (should return empty, not all rows)
    const cross = await prisma.vacancy.findMany({
      where: { tenantId: 'tenant-other' },
      take: 5,
    });
    console.log('Cross-tenant query (tenant-other):', JSON.stringify(cross));

    console.log('Vacancy tenantId column is queryable: YES');
  } catch (e) {
    console.error('ERROR:', e.message || e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
