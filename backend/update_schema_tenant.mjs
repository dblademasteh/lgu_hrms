import fs from 'fs';

const schemaPath = './prisma/schema.prisma';
let content = fs.readFileSync(schemaPath, 'utf8');

// Models that need tenantId added (excluding Tenant, User, Department, Position, Vacancy which already have it)
const modelsNeedingTenant = [
  'Employee', 'FamilyMember', 'EducationRecord', 'Award', 'EmploymentHistory',
  'PayrollPeriod', 'PayrollRun', 'PayrollItem', 'PayrollDeductionLine', 'Payslip',
  'LedgerEntry', 'AuditLog', 'UserSession', 'LoginEvent', 'Delegation',
  'LeaveRequest', 'LeaveCredit', 'Attendance', 'Appointment', 'PerformanceReview',
  'PlantillaItem', 'VacancyPublication', 'DesignationOrder', 'TrainingProgram',
  'TrainingEnrollment', 'Eligibility', 'Disqualification', 'Applicant', 'Interview',
  'ContributionRule', 'TaxBracket', 'LeaveRuleConfig', 'Bonus', 'IDP',
  'Competency', 'Loan', 'LoanAmortization', 'AttendanceRule'
];

let modified = 0;

for (const modelName of modelsNeedingTenant) {
  // Pattern: find "model MODELNAME {" and add tenantId after the @id line
  // Also add tenant relation at the end of the model block
  
  // Add tenantId field after id line
  const modelStartRegex = new RegExp(`(model ${modelName} \\{\\n  id\\s+String\\s+@id @default\\(uuid\\)\\)\\n)`);
  if (modelStartRegex.test(content)) {
    // Add tenantId after id
    content = content.replace(modelStartRegex, `$1  tenantId    String?\n`);
    modified++;
  } else {
    // Try with different id patterns
    const altRegex = new RegExp(`(model ${modelName} \\{[\\s\\S]*?id\\s+String\\s+@id @default\\(uuid\\)\\s*\\n)`);
    if (altRegex.test(content)) {
      content = content.replace(altRegex, (match) => {
        if (match.includes('tenantId')) return match;
        return match + '  tenantId    String?\n';
      });
      modified++;
    }
  }
  
  // Add tenant relation at end of model block (before closing })
  // Find the model's properties and add tenant relation before the closing brace
  const modelBlockRegex = new RegExp(`(model ${modelName} \\{[^}]*?)(\\n\\})`, 's');
  if (modelBlockRegex.test(content)) {
    content = content.replace(modelBlockRegex, (match, body, close) => {
      if (body.includes('tenant ') || body.includes('tenant Tenant')) return match;
      // Check if there's already a tenant relation
      const hasTenantRelation = /tenant\s+Tenant\?/.test(body);
      if (!hasTenantRelation) {
        // Find last line before closing brace to determine indentation
        const lines = body.split('\n');
        const lastNonEmpty = lines[lines.length - 1];
        const indent = lastNonEmpty.match(/^(\s*)/)[1];
        return body + `${indent}tenant      Tenant?   @relation(fields: [tenantId], references: [id])` + close;
      }
      return match;
    });
    modified++;
  }
}

fs.writeFileSync(schemaPath, content);
console.log(`Modified ${modified} models`);
console.log('Done!');
