import { prisma } from './src/lib/prisma.js';

const tables = [
  'User','Department','Employee','FamilyMember','EducationRecord','Award',
  'EmploymentHistory','PayrollPeriod','PayrollRun','PayrollItem','PayrollDeductionLine',
  'Payslip','LedgerEntry','AuditLog','UserSession','LoginEvent','Delegation',
  'LeaveRequest','LeaveCredit','Attendance','Appointment','PerformanceReview',
  'PlantillaItem','Vacancy','VacancyPublication','DesignationOrder',
  'TrainingProgram','TrainingEnrollment','Eligibility','Disqualification',
  'Applicant','Interview','ContributionRule','TaxBracket','LeaveRuleConfig',
  'Bonus','IDP','Competency','AttendanceRule'
];

const res = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;`;
console.log('DB tables:', res.map(r=>r.tablename).join(', '));
console.log('—'.repeat(60));

for (const t of tables) {
  const hasTenant = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = ${t} AND column_name = 'tenantId';`;
  if (hasTenant.length > 0) {
    console.log(`✓ ${t.padEnd(28)} HAS tenantId`);
  } else {
    console.log(`✗ ${t.padEnd(28)} NO tenantId`);
  }
}

await prisma.$disconnect();
