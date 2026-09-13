import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const key = 'lgu-hrms-test-key-12345';
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  
  // Check if exists
  const existing = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
  if (existing) {
    console.log('API key already exists:', key);
    console.log('Hash:', hash);
    console.log('Scopes:', existing.scopes);
    console.log('TenantId:', existing.tenantId);
    return;
  }
  
  // Create new
  const record = await prisma.apiKey.create({
    data: {
      keyHash: hash,
      name: 'HRMS Integration Test Key',
      tenantId: 'tenant-default',
      scopes: ['employees:read'],
    },
  });
  console.log('Created API key:', key);
  console.log('Hash:', hash);
  console.log('Id:', record.id);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());