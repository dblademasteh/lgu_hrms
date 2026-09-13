import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { DEFAULT_PERMISSIONS } from '../src/shared/permissions.js';

const prisma = new PrismaClient();

async function seedTenant(tenantId, tenantCode, hash) {
  // ── LGU Organizational Structure per CSC Resolution 2200373 ──────────
  // Provincial-level departments/divisions/sections with OSSP compliance fields

  // 1. Office of the Provincial Governor (mandatory, top level)
  const deptPGO = await prisma.department.upsert({
    where: { code: `PGO-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `PGO-${tenantCode}`,
      name: "Governor's Office",
      level: 0,
      unitType: 'DEPARTMENT',
      isMandatory: true,
      isHrmOffice: false,
      headTitle: 'Provincial Governor',
      tenant: { connect: { id: tenantId } },
    },
  });

  // 2. Office of the Provincial Vice Governor (mandatory)
  const deptPVGO = await prisma.department.upsert({
    where: { code: `PVGO-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `PVGO-${tenantCode}`,
      name: "Vice Governor's Office",
      level: 0,
      unitType: 'DEPARTMENT',
      isMandatory: true,
      isHrmOffice: false,
      headTitle: 'Provincial Vice Governor',
      tenant: { connect: { id: tenantId } },
    },
  });

  // 3. Sangguniang Panlalawigan (mandatory)
  const deptSP = await prisma.department.upsert({
    where: { code: `SP-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `SP-${tenantCode}`,
      name: 'Sangguniang Panlalawigan',
      level: 0,
      unitType: 'DEPARTMENT',
      isMandatory: true,
      isHrmOffice: false,
      headTitle: 'Presiding Officer',
      sanggunianConcurrence: true,
      concurrenceDate: new Date('2022-11-01'),
      concurrenceResolution: `SP-${tenantCode}-2022-001`,
      tenant: { connect: { id: tenantId } },
    },
  });

  // 4. HR Management Office (mandatory, encouraged by CSC)
  const deptHR = await prisma.department.upsert({
    where: { code: `HRMO-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `HRMO-${tenantCode}`,
      name: 'Human Resource Management Office',
      parent: { connect: { id: deptPGO.id } },
      level: 1,
      unitType: 'DEPARTMENT',
      isMandatory: true,
      isHrmOffice: true,
      headTitle: 'HRMO',
      sanggunianConcurrence: true,
      concurrenceDate: new Date('2022-11-05'),
      concurrenceResolution: `SP-${tenantCode}-2022-002`,
      tenant: { connect: { id: tenantId } },
    },
  });

  // 5. Finance Office (mandatory)
  const deptFIN = await prisma.department.upsert({
    where: { code: `FIN-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `FIN-${tenantCode}`,
      name: 'Finance Office',
      parent: { connect: { id: deptPGO.id } },
      level: 1,
      unitType: 'DEPARTMENT',
      isMandatory: true,
      isHrmOffice: false,
      headTitle: 'Provincial Accountant',
      sanggunianConcurrence: true,
      concurrenceDate: new Date('2022-11-05'),
      concurrenceResolution: `SP-${tenantCode}-2022-003`,
      tenant: { connect: { id: tenantId } },
    },
  });

  // 6. Accounting Division under Finance (optional but common)
  const deptAccountingDiv = await prisma.department.upsert({
    where: { code: `ACCTG-DIV-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `ACCTG-DIV-${tenantCode}`,
      name: 'Accounting Division',
      parent: { connect: { id: deptFIN.id } },
      level: 2,
      unitType: 'DIVISION',
      isMandatory: false,
      isOptional: true,
      isHrmOffice: false,
      headTitle: 'Division Chief',
      tenant: { connect: { id: tenantId } },
    },
  });

  // 7. Budget Division under Finance (optional)
  const deptBudgetDiv = await prisma.department.upsert({
    where: { code: `BUDGET-DIV-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `BUDGET-DIV-${tenantCode}`,
      name: 'Budget Division',
      parent: { connect: { id: deptFIN.id } },
      level: 2,
      unitType: 'DIVISION',
      isMandatory: false,
      isOptional: true,
      isHrmOffice: false,
      headTitle: 'Division Chief',
      tenant: { connect: { id: tenantId } },
    },
  });

  // 8. IT Office (optional)
  const deptIT = await prisma.department.upsert({
    where: { code: `ITO-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `ITO-${tenantCode}`,
      name: 'Information Technology Office',
      parent: { connect: { id: deptPGO.id } },
      level: 1,
      unitType: 'DEPARTMENT',
      isMandatory: false,
      isOptional: true,
      isHrmOffice: false,
      headTitle: 'IT Officer',
      tenant: { connect: { id: tenantId } },
    },
  });

  // 9. Administration Division under PGO (mandatory)
  const deptAdminDiv = await prisma.department.upsert({
    where: { code: `ADMIN-DIV-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `ADMIN-DIV-${tenantCode}`,
      name: 'Administration Division',
      parent: { connect: { id: deptPGO.id } },
      level: 2,
      unitType: 'DIVISION',
      isMandatory: true,
      isOptional: false,
      isHrmOffice: false,
      headTitle: 'Division Chief',
      tenant: { connect: { id: tenantId } },
    },
  });

  // 10. Administration Section under Administration Division
  const deptAdminSec = await prisma.department.upsert({
    where: { code: `ADMIN-SEC-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `ADMIN-SEC-${tenantCode}`,
      name: 'Administration Section',
      parent: { connect: { id: deptAdminDiv.id } },
      level: 3,
      unitType: 'SECTION',
      isMandatory: false,
      isOptional: true,
      isHrmOffice: false,
      tenant: { connect: { id: tenantId } },
    },
  });

  // 11. Legal Office (optional)
  const deptLegal = await prisma.department.upsert({
    where: { code: `LEGAL-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `LEGAL-${tenantCode}`,
      name: 'Legal Office',
      parent: { connect: { id: deptPGO.id } },
      level: 1,
      unitType: 'DEPARTMENT',
      isMandatory: false,
      isOptional: true,
      isHrmOffice: false,
      headTitle: 'Legal Officer',
      tenant: { connect: { id: tenantId } },
    },
  });

  const roles = ['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD', 'AUDITOR', 'EMPLOYEE'];
  for (const roleName of roles) {
    const existing = await prisma.role.findFirst({ where: { name: roleName, tenantId } });
    if (existing) {
      await prisma.role.update({ where: { id: existing.id }, data: { description: `System role: ${roleName}`, isSystem: true, tenantId } });
    } else {
      await prisma.role.create({ data: { name: roleName, description: `System role: ${roleName}`, isSystem: true, tenantId } });
    }
  }

  // Default capability matrix (mirrors historical role whitelist; editable later).
  for (const roleName of roles) {
    const role = await prisma.role.findFirst({ where: { name: roleName, tenantId } });
    if (!role) continue;
    const defaults = DEFAULT_PERMISSIONS[roleName] ?? {};
    for (const [key, allowed] of Object.entries(defaults)) {
      await prisma.rolePermission.upsert({
        where: { roleId_key: { roleId: role.id, key } },
        update: { allowed, tenantId },
        create: { roleId: role.id, key, allowed, tenantId },
      });
    }
  }

  const roleUsers = [
    { username: `admin-${tenantCode.toLowerCase()}`, role: 'ADMIN' },
    { username: `hr_manager-${tenantCode.toLowerCase()}`, role: 'HR_MANAGER' },
    { username: `payroll_officer-${tenantCode.toLowerCase()}`, role: 'PAYROLL_OFFICER' },
    { username: `department_head-${tenantCode.toLowerCase()}`, role: 'DEPARTMENT_HEAD' },
    { username: `auditor-${tenantCode.toLowerCase()}`, role: 'AUDITOR' },
    { username: `employee-${tenantCode.toLowerCase()}`, role: 'EMPLOYEE' },
  ];
  for (const u of roleUsers) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: hash, passwordChangedAt: new Date(), tenantId, role: u.role },
      create: {
        username: u.username,
        passwordHash: hash,
        passwordChangedAt: new Date(),
        role: u.role,
        department: { connect: { id: deptPGO.id } },
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  const adminUser = await prisma.user.findUnique({ where: { username: `admin-${tenantCode.toLowerCase()}` } });

  // ── Positions per IOS-LGU 2021 Edition ──────────────────────────────

  const posGov = await prisma.position.upsert({
    where: { id: `position-governor-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-governor-${tenantCode}`,
      title: 'Provincial Governor',
      parentheticalTitle: 'Elected Official',
      iosLguCode: 'GOV-01',
      salaryGrade: 30,
      isMandatory: true,
      isCoterminous: true,
      tenant: { connect: { id: tenantId } },
    },
  });

  const posViceGov = await prisma.position.upsert({
    where: { id: `position-vice-governor-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-vice-governor-${tenantCode}`,
      title: 'Provincial Vice Governor',
      parentheticalTitle: 'Elected Official',
      iosLguCode: 'VGOV-01',
      salaryGrade: 29,
      isMandatory: true,
      isCoterminous: true,
      tenant: { connect: { id: tenantId } },
    },
  });

  const posSanggunian = await prisma.position.upsert({
    where: { id: `position-sanggunian-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-sanggunian-${tenantCode}`,
      title: 'Sanggunian Member',
      parentheticalTitle: 'Legislative',
      iosLguCode: 'SP-01',
      salaryGrade: 24,
      isMandatory: true,
      isCoterminous: true,
      tenant: { connect: { id: tenantId } },
    },
  });

  const posHRMO = await prisma.position.upsert({
    where: { id: `position-hrmo-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-hrmo-${tenantCode}`,
      title: 'HRMO',
      parentheticalTitle: 'Human Resource Management Office',
      iosLguCode: 'HRM-02',
      salaryGrade: 24,
      isMandatory: true,
      isCoterminous: false,
      qualificationStandards: 'Bachelor\'s degree in HRM, Psychology, or related field; 2 years experience in HR management.',
      tenant: { connect: { id: tenantId } },
    },
  });

  const posAccountant = await prisma.position.upsert({
    where: { id: `position-accountant-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-accountant-${tenantCode}`,
      title: 'Accountant',
      parentheticalTitle: 'Accounting',
      iosLguCode: 'ACC-01',
      salaryGrade: 15,
      isMandatory: true,
      isCoterminous: false,
      qualificationStandards: 'CPA, Bachelor\'s degree in Accounting; 1 year experience.',
      tenant: { connect: { id: tenantId } },
    },
  });

  const posBudgetOfficer = await prisma.position.upsert({
    where: { id: `position-budget-officer-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-budget-officer-${tenantCode}`,
      title: 'Budget Officer',
      parentheticalTitle: 'Budget',
      iosLguCode: 'BDG-01',
      salaryGrade: 15,
      isMandatory: true,
      isCoterminous: false,
      qualificationStandards: 'Bachelor\'s degree in Accounting or related field; 2 years experience in budget.',
      tenant: { connect: { id: tenantId } },
    },
  });

  const posAdminAsst = await prisma.position.upsert({
    where: { id: `position-admin-assistant-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-admin-assistant-${tenantCode}`,
      title: 'Administrative Assistant',
      parentheticalTitle: 'Administrative Support',
      iosLguCode: 'ADM-01',
      salaryGrade: 8,
      isMandatory: true,
      isCoterminous: false,
      tenant: { connect: { id: tenantId } },
    },
  });

  const posIT = await prisma.position.upsert({
    where: { id: `position-it-officer-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-it-officer-${tenantCode}`,
      title: 'IT Officer',
      parentheticalTitle: 'Information Technology',
      iosLguCode: 'IT-01',
      salaryGrade: 15,
      isMandatory: false,
      isCoterminous: false,
      tenant: { connect: { id: tenantId } },
    },
  });

  const posLegal = await prisma.position.upsert({
    where: { id: `position-legal-officer-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-legal-officer-${tenantCode}`,
      title: 'Legal Officer',
      parentheticalTitle: 'Legal Services',
      iosLguCode: 'LEG-01',
      salaryGrade: 24,
      isMandatory: false,
      isCoterminous: true,
      qualificationStandards: 'Law degree; eligible to practice law; 2 years experience.',
      tenant: { connect: { id: tenantId } },
    },
  });

  // ── Plantilla Items (OSSP) ─────────────────────────────────────────
  const plantillaItems = [
    { itemNumber: `PLT-${tenantCode}-GOV-01`, positionId: posGov.id, departmentId: deptPGO.id, status: 'FILLED', isMandatory: true, itemType: 'NEW_STYLE', salaryGrade: '30', step: '1', sourceOfFund: 'Local Funds', appropriationCode: `2026-${tenantCode}-001`, authorizedSalary: 180000 },
    { itemNumber: `PLT-${tenantCode}-VGOV-01`, positionId: posViceGov.id, departmentId: deptPVGO.id, status: 'FILLED', isMandatory: true, itemType: 'NEW_STYLE', salaryGrade: '29', step: '1', sourceOfFund: 'Local Funds', appropriationCode: `2026-${tenantCode}-002`, authorizedSalary: 165000 },
    { itemNumber: `PLT-${tenantCode}-SP-01`, positionId: posSanggunian.id, departmentId: deptSP.id, status: 'FILLED', isMandatory: true, itemType: 'NEW_STYLE', salaryGrade: '24', step: '1', sourceOfFund: 'Local Funds', appropriationCode: `2026-${tenantCode}-003`, authorizedSalary: 120000 },
    { itemNumber: `PLT-${tenantCode}-HRM-01`, positionId: posHRMO.id, departmentId: deptHR.id, status: 'FILLED', isMandatory: true, itemType: 'NEW_STYLE', salaryGrade: '24', step: '1', sourceOfFund: 'Local Funds', appropriationCode: `2026-${tenantCode}-004`, authorizedSalary: 120000 },
    { itemNumber: `PLT-${tenantCode}-ACC-01`, positionId: posAccountant.id, departmentId: deptAccountingDiv.id, status: 'FILLED', isMandatory: true, itemType: 'NEW_STYLE', salaryGrade: '15', step: '1', sourceOfFund: 'Local Funds', appropriationCode: `2026-${tenantCode}-005`, authorizedSalary: 60000 },
    { itemNumber: `PLT-${tenantCode}-BDG-01`, positionId: posBudgetOfficer.id, departmentId: deptBudgetDiv.id, status: 'FILLED', isMandatory: true, itemType: 'NEW_STYLE', salaryGrade: '15', step: '1', sourceOfFund: 'Local Funds', appropriationCode: `2026-${tenantCode}-006`, authorizedSalary: 60000 },
    { itemNumber: `PLT-${tenantCode}-ADM-01`, positionId: posAdminAsst.id, departmentId: deptAdminSec.id, status: 'FILLED', isMandatory: true, itemType: 'NEW_STYLE', salaryGrade: '8', step: '1', sourceOfFund: 'Local Funds', appropriationCode: `2026-${tenantCode}-007`, authorizedSalary: 30000 },
    { itemNumber: `PLT-${tenantCode}-IT-01`, positionId: posIT.id, departmentId: deptIT.id, status: 'VACANT', isMandatory: false, isOptional: true, itemType: 'NEW_STYLE', salaryGrade: '15', step: '1', sourceOfFund: 'Local Funds', appropriationCode: `2026-${tenantCode}-008`, authorizedSalary: 60000 },
    { itemNumber: `PLT-${tenantCode}-LEG-01`, positionId: posLegal.id, departmentId: deptLegal.id, status: 'VACANT', isMandatory: false, isOptional: true, itemType: 'NEW_STYLE', salaryGrade: '24', step: '1', sourceOfFund: 'Local Funds', appropriationCode: `2026-${tenantCode}-009`, authorizedSalary: 120000 },
  ];

  for (const pl of plantillaItems) {
    await prisma.plantillaItem.upsert({
      where: { itemNumber: pl.itemNumber },
      update: { tenantId },
      create: {
        ...pl,
        tenantId,
      },
    });
  }

  // ── Employees ──────────────────────────────────────────────────────
  const employeesData = [
    {
      employeeNumber: `EMP-${tenantCode}-0001`,
      firstName: 'Maria',
      lastName: 'Santos',
      middleName: 'L.',
      birthDate: new Date('1990-05-12'),
      gender: 'Female',
      civilStatus: 'Married',
      address: 'Tarlac City, Tarlac',
      departmentId: deptHR.id,
      positionId: posHRMO.id,
      hiredDate: new Date('2015-01-15'),
      monthlySalary: 46000,
    },
    {
      employeeNumber: `EMP-${tenantCode}-0002`,
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      middleName: 'M.',
      birthDate: new Date('1988-09-30'),
      gender: 'Male',
      civilStatus: 'Single',
      address: 'San Jose, Tarlac',
      departmentId: deptFIN.id,
      positionId: posBudgetOfficer.id,
      hiredDate: new Date('2018-06-01'),
      monthlySalary: 35000,
    },
    {
      employeeNumber: `EMP-${tenantCode}-0003`,
      firstName: 'Ana',
      lastName: 'Reyes',
      middleName: 'P.',
      birthDate: new Date('1992-02-20'),
      gender: 'Female',
      civilStatus: 'Single',
      address: 'Capas, Tarlac',
      departmentId: deptPGO.id,
      positionId: posAdminAsst.id,
      hiredDate: new Date('2020-03-10'),
      monthlySalary: 28000,
    },
    {
      employeeNumber: `EMP-${tenantCode}-0004`,
      firstName: 'Carlos',
      lastName: 'Mendoza',
      middleName: 'R.',
      birthDate: new Date('1985-11-15'),
      gender: 'Male',
      civilStatus: 'Married',
      address: 'Camiling, Tarlac',
      departmentId: deptPGO.id,
      positionId: posAdminAsst.id,
      hiredDate: new Date('2012-07-01'),
      monthlySalary: 60000,
    },
    {
      employeeNumber: `EMP-${tenantCode}-0005`,
      firstName: 'Elena',
      lastName: 'Rodriguez',
      middleName: 'S.',
      birthDate: new Date('1995-08-22'),
      gender: 'Female',
      civilStatus: 'Single',
      address: 'Tarlac City, Tarlac',
      departmentId: deptFIN.id,
      positionId: posAccountant.id,
      hiredDate: new Date('2019-01-15'),
      monthlySalary: 32000,
    },
    {
      employeeNumber: `EMP-${tenantCode}-0006`,
      firstName: 'Roberto',
      lastName: 'Villanueva',
      middleName: 'T.',
      birthDate: new Date('1993-03-18'),
      gender: 'Male',
      civilStatus: 'Single',
      address: 'Tarlac City, Tarlac',
      departmentId: deptIT.id,
      positionId: posIT.id,
      hiredDate: new Date('2021-05-10'),
      monthlySalary: 26000,
    },
  ];

  for (const emp of employeesData) {
    const employee = await prisma.employee.upsert({
      where: { employeeNumber: emp.employeeNumber },
      update: { tenantId, monthlySalary: emp.monthlySalary },
      create: { ...emp, tenantId },
    });

    const leaveTypes = ['VACATION', 'SICK', 'SPECIAL_PRIVILEGE', 'SOLO_PARENT'];
    for (const lt of leaveTypes) {
      await prisma.leaveCredit.create({
        data: { employeeId: employee.id, type: lt, balance: 15, year: new Date().getFullYear(), tenantId },
      });
    }
  }

  // ── Payroll Periods ─────────────────────────────────────────────────
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear();
  await prisma.payrollPeriod.upsert({
    where: { id: `period-${currentMonth}-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `period-${currentMonth}-${tenantCode}`,
      name: `${currentMonth} Payroll`,
      startDate: new Date(`${currentMonth}-01`),
      endDate: new Date(`${currentMonth}-30`),
      fiscalYear: currentYear,
      status: 'OPEN',
      tenant: { connect: { id: tenantId } },
    },
  });

  // ── Attendance Sample ──────────────────────────────────────────────
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  for (const emp of employeesData.slice(0, 3)) {
    const employee = await prisma.employee.findFirst({ where: { employeeNumber: emp.employeeNumber, tenantId } });
    if (!employee) continue;
    await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: new Date(dateStr),
        timeIn: new Date(`${dateStr}T08:00:00`),
        timeOut: new Date(`${dateStr}T17:00:00`),
        remark: 'On time',
        tenantId,
      },
    });
  }
}

async function main() {
  const hash = await bcrypt.hash(process.env.SEED_DEFAULT_PASSWORD || 'admin123', 10);

  const tenantsData = [
    { id: 'tenant-default', code: 'DEFAULT', name: 'Default LGU' },
    { id: 'tenant-tarlac', code: 'TARLAC', name: 'Tarlac City LGU' },
  ];

  for (const t of tenantsData) {
    await prisma.tenant.upsert({
      where: { code: t.code },
      update: {},
      create: t,
    });
  }

  for (const t of tenantsData) {
    await seedTenant(t.id, t.code, hash);
  }

  console.log('Seed completed successfully');
}

main().catch(e => {
  console.error('Seed failed:', e);
  process.exit(1);
}).finally(() => prisma.$disconnect());