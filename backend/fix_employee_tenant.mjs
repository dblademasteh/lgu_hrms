import { prisma } from './src/lib/prisma.js';

// Apply Employee tenantId column directly
try {
  await prisma.$executeRawUnsafe(`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;`);
  console.log('Column added to Employee');
} catch(e) {
  console.log('Column add:', e.message.substring(0, 120));
}

try {
  await prisma.$executeRawUnsafe(`ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;`);
  console.log('FK added to Employee');
} catch(e) {
  console.log('FK add:', e.message.substring(0, 120));
}

try {
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Employee_tenantId_idx" ON "Employee" ("tenantId");`);
  console.log('Index added to Employee');
} catch(e) {
  console.log('Index add:', e.message.substring(0, 120));
}

// Verify
const cols = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Employee' AND column_name = 'tenantId'`);
console.log('Employee tenantId exists:', cols.length > 0);

await prisma.$disconnect();
