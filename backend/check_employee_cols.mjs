import { prisma } from './src/lib/prisma.js';

const cols = await prisma.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Employee' ORDER BY ordinal_position`);
console.log(JSON.stringify(cols, null, 2));
await prisma.$disconnect();
