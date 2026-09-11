import fs from 'fs';

const schemaPath = './prisma/schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

// Find all models that have `tenant Tenant? @relation(fields: [tenantId]` but don't have `tenantId String?`
const models = content.split(/(?=^model \w+)/m).filter(b => b.trim().startsWith('model '));

let fixed = 0;

for (let block of models) {
  const modelMatch = block.match(/^model (\w+)/);
  if (!modelMatch) continue;
  const modelName = modelMatch[1];
  
  // Check if this model has the tenant relation
  const hasTenantRel = /tenant\s+Tenant\?\s+@relation\(fields: \[tenantId\]/.test(block);
  if (!hasTenantRel) continue;
  
  // Check if it already has tenantId field
  const hasTenantIdField = /\btenantId\s+String\?/.test(block);
  if (hasTenantIdField) continue;
  
  // Add tenantId field after the @id line
  const idLineRegex = /^(\s*id\s+String\s+@id @default\(uuid\(\))\s*$/m;
  if (idLineRegex.test(block)) {
    // Determine indentation from the id line
    const match = block.match(idLineRegex);
    const indent = match[1].match(/^(\s*)/)[1];
    
    // For some models the id line is `id String @id @default(uuid())` 
    // but some might have different patterns
    block = block.replace(idLineRegex, `$&\n${indent}tenantId    String?\n`);
    
    // Replace the block in content
    content = content.replace(block.split('\n').slice(0,2).join('\n') + block.substring(block.indexOf('\n', block.indexOf('\n')+1), 2), block);
    
    // Actually, let's just replace the whole block
    const originalBlock = models.find(m => m.startsWith(`model ${modelName}`));
    if (originalBlock && originalBlock !== block) {
      content = content.replace(originalBlock, block);
    }
    
    fixed++;
    console.log(`Fixed: ${modelName}`);
  } else {
    // Try alternative id patterns
    const altIdRegex = /^(\s*id\s+String\s+@id\s+@default\(uuid\(\)\))/m;
    if (altIdRegex.test(block)) {
      const match = block.match(altIdRegex);
      const indent = match[1].match(/^(\s*)/)[1];
      // Just add the field by finding the id line
      const lines = block.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*id\s+String\s+@id/.test(lines[i]) && !lines[i+1]?.includes('tenantId')) {
          lines.splice(i + 1, 0, `${indent}tenantId    String?`);
          fixed++;
          console.log(`Fixed (alt): ${modelName}`);
          break;
        }
      }
      // Rebuild block
      const newBlock = lines.join('\n');
      const originalBlock = models.find(m => m.startsWith(`model ${modelName}`));
      if (originalBlock) {
        content = content.replace(originalBlock, newBlock);
      }
    }
  }
}

fs.writeFileSync(schemaPath, content);
console.log(`\nTotal fixed: ${fixed}`);
