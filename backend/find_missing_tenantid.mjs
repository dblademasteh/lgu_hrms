import fs from 'fs';

const content = fs.readFileSync('./prisma/schema.prisma', 'utf8');
const models = content.split(/(?=^model \w+)/m).filter(b => b.trim().startsWith('model '));

for (const block of models) {
  const modelMatch = block.match(/^model (\w+)/);
  if (!modelMatch) continue;
  const modelName = modelMatch[1];
  
  const hasTenantRel = /tenant\s+Tenant\?\s+@relation\(fields: \[tenantId\]/.test(block);
  const hasTenantIdField = /\btenantId\s+String\?/.test(block);
  
  if (hasTenantRel && !hasTenantIdField) {
    console.log(`MISSING tenantId field: ${modelName}`);
  }
}
