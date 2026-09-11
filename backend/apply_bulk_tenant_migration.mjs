import { prisma } from './src/lib/prisma.js';
import fs from 'fs';
import path from 'path';

const migrationFile = './prisma/migrations/20260911140000_add_tenantId_remaining_models/migration.sql';
const sql = fs.readFileSync(migrationFile, 'utf8');

// Execute the migration SQL
const statements = sql.split(';').filter(s => s.trim().length > 0);

let ok = 0, skip = 0, errs = 0;
for (const stmt of statements) {
  try {
    await prisma.$executeRawUnsafe(stmt + ';');
    ok++;
  } catch (e) {
    const msg = e.message.substring(0, 120);
    if (msg.includes('exists') || msg.includes('duplicate')) {
      skip++;
    } else {
      errs++;
      console.log('ERROR:', stmt.substring(0, 80), '->', msg);
    }
  }
}
console.log(`OK: ${ok}, SKIP: ${skip}, ERRORS: ${errs}`);
console.log('✅ Migration applied successfully');

// Verify
const tables = [
  'Employee','FamilyMember','EducationRecord','Award','EmploymentHistory',
  'PayrollPeriod','PayrollRun','PayrollItem','PayrollDeductionLine','Payslip',
  'LedgerEntry','AuditLog','UserSession','LoginEvent','Delegation',
  'LeaveRequest','LeaveCredit','Attendance','Appointment','PerformanceReview',
  'PlantillaItem','Position','VacancyPublication','DesignationOrder',
  'TrainingProgram','TrainingEnrollment','Eligibility','Disqualification',
  'Applicant','Interview','ContributionRule','TaxBracket','LeaveRuleConfig',
  'Bonus','IDP','Competency','Loan','LoanAmortization','AttendanceRule'
];

for (const t of tables) {
  const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = ${t} AND column_name = 'tenantId';`;
  console.log(cols.length > 0 ? `✓ ${t.padEnd(28)} HAS tenantId` : `✗ ${t.padEnd(28)} NO tenantId`);
}

await prisma.$disconnect();
