import fs from 'fs';

const schemaPath = './prisma/schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

// For each model that has `tenant Tenant? @relation(fields: [tenantId]` but no `tenantId String?`
// We need to insert `tenantId    String?` right after the id line

const lines = content.split('\n');
let inModel = false;
let modelName = '';
let idLineIdx = -1;
let hasTenantId = false;
let hasTenantRel = false;
let fixes = 0;

// First pass: identify models that need fixing and record line numbers
const toFix = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const modelStart = line.match(/^model (\w+)/);
  
  if (modelStart) {
    // Save previous model if it needs fixing
    if (inModel && hasTenantRel && !hasTenantId && idLineIdx >= 0) {
      toFix.push({ modelName, idLineIdx, insertAt: idLineIdx + 1 });
    }
    
    inModel = true;
    modelName = modelStart[1];
    idLineIdx = -1;
    hasTenantId = false;
    hasTenantRel = false;
  }
  
  if (inModel) {
    if (/^\s*id\s+String\s+@id/.test(line)) {
      idLineIdx = i;
    }
    if (/\btenantId\s+String\?/.test(line)) {
      hasTenantId = true;
    }
    if (/tenant\s+Tenant\?\s+@relation\(fields: \[tenantId\]/.test(line)) {
      hasTenantRel = true;
    }
    
    // Check for model end (closing brace at same indent as model)
    if (/^\}/.test(line) && inModel) {
      if (hasTenantRel && !hasTenantId && idLineIdx >= 0) {
        toFix.push({ modelName, idLineIdx, insertAt: idLineIdx + 1 });
      }
      inModel = false;
    }
  }
}

// Handle last model
if (inModel && hasTenantRel && !hasTenantId && idLineIdx >= 0) {
  toFix.push({ modelName, idLineIdx, insertAt: idLineIdx + 1 });
}

// Second pass: insert tenantId fields in reverse order
for (let i = toFix.length - 1; i >= 0; i--) {
  const fix = toFix[i];
  // Get indentation from the id line
  const idLine = lines[fix.idLineIdx];
  const indentMatch = idLine.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '  ';
  
  lines.splice(fix.insertAt, 0, `${indent}tenantId    String?`);
  fixes++;
  console.log(`Fixed: ${fix.modelName}`);
}

fs.writeFileSync(schemaPath, lines.join('\n'));
console.log(`\nTotal fixed: ${fixes}`);
