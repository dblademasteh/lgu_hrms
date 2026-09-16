import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { DEFAULT_PERMISSIONS } from '../src/shared/permissions.js';

const prisma = new PrismaClient();

const OFFICE_TEMPLATES = {
  PROVINCIAL: {
    prefix: 'P',
    executive: [
      { code: 'PGO', name: "Governor's Office", headTitle: 'Provincial Governor', isHrmOffice: false },
      { code: 'PVGO', name: "Vice Governor's Office", headTitle: 'Provincial Vice Governor', isHrmOffice: false },
    ],
    legislative: [
      { code: 'SP', name: 'Sangguniang Panlalawigan', headTitle: 'Presiding Officer', sanggunianConcurrence: true },
    ],
    line: [
      { code: 'PPDO', name: 'Provincial Planning & Development Office', headTitle: 'Provincial Planner' },
      { code: 'PTO', name: "Provincial Treasurer's Office", headTitle: 'Provincial Treasurer' },
      { code: 'PAO', name: 'Provincial Assessor\'s Office', headTitle: 'Provincial Assessor' },
      { code: 'PACO', name: 'Provincial Accounting Office', headTitle: 'Provincial Accountant' },
      { code: 'PBO', name: 'Provincial Budget Office', headTitle: 'Provincial Budget Officer' },
      { code: 'PEngr', name: 'Provincial Engineering Office', headTitle: 'Provincial Engineer' },
      { code: 'PHO', name: 'Provincial Health Office', headTitle: 'Provincial Health Officer' },
      { code: 'PSWD', name: 'Provincial Social Welfare & Development Office', headTitle: 'Provincial Social Welfare Officer' },
      { code: 'PAgr', name: 'Provincial Agriculture Office', headTitle: 'Provincial Agriculture Officer' },
      { code: 'PDRRMO', name: 'Provincial DRRM Office', headTitle: 'Provincial DRRM Officer' },
    ],
    support: [
      { code: 'PHRMO', name: 'Provincial Human Resource Management Office', headTitle: 'Provincial HRMO', isHrmOffice: true },
      { code: 'PITO', name: 'Provincial Information Technology Office', headTitle: 'Provincial IT Officer' },
      { code: 'PLegal', name: 'Provincial Legal Office', headTitle: 'Provincial Legal Officer' },
      { code: 'PGSO', name: 'Provincial General Services Office', headTitle: 'Provincial General Services Officer' },
    ],
  },
  CITY: {
    prefix: 'C',
    executive: [
      { code: 'CMO', name: "Office of the City Mayor", headTitle: 'City Mayor', isHrmOffice: false },
      { code: 'CVM', name: "Office of the City Vice Mayor", headTitle: 'City Vice Mayor', isHrmOffice: false },
    ],
    legislative: [
      { code: 'SP', name: 'Sangguniang Panlungsod', headTitle: 'Presiding Officer', sanggunianConcurrence: true },
    ],
    line: [
      { code: 'CPDO', name: 'City Planning & Development Office', headTitle: 'City Planner' },
      { code: 'CTO', name: "City Treasurer's Office", headTitle: 'City Treasurer' },
      { code: 'CAO', name: 'City Assessor\'s Office', headTitle: 'City Assessor' },
      { code: 'CACO', name: 'City Accounting Office', headTitle: 'City Accountant' },
      { code: 'CBO', name: 'City Budget Office', headTitle: 'City Budget Officer' },
      { code: 'CEngr', name: 'City Engineering Office', headTitle: 'City Engineer' },
      { code: 'CHO', name: 'City Health Office', headTitle: 'City Health Officer' },
      { code: 'CSWD', name: 'City Social Welfare & Development Office', headTitle: 'City Social Welfare Officer' },
      { code: 'CAgr', name: 'City Agriculture Office', headTitle: 'City Agriculture Officer' },
      { code: 'CDRRMO', name: 'City DRRM Office', headTitle: 'City DRRM Officer' },
    ],
    support: [
      { code: 'CHRMO', name: 'City Human Resource Management Office', headTitle: 'City HRMO', isHrmOffice: true },
      { code: 'CITO', name: 'City Information Technology Office', headTitle: 'City IT Officer' },
      { code: 'CLegal', name: 'City Legal Office', headTitle: 'City Legal Officer' },
      { code: 'CGSO', name: 'City General Services Office', headTitle: 'City General Services Officer' },
    ],
  },
  MUNICIPAL: {
    prefix: 'M',
    executive: [
      { code: 'MMO', name: "Office of the Municipal Mayor", headTitle: 'Municipal Mayor', isHrmOffice: false },
      { code: 'MVM', name: "Office of the Municipal Vice Mayor", headTitle: 'Municipal Vice Mayor', isHrmOffice: false },
    ],
    legislative: [
      { code: 'SB', name: 'Sangguniang Bayan', headTitle: 'Presiding Officer', sanggunianConcurrence: true },
    ],
    line: [
      { code: 'MPDO', name: 'Municipal Planning & Development Office', headTitle: 'Municipal Planner' },
      { code: 'MTO', name: "Municipal Treasurer's Office", headTitle: 'Municipal Treasurer' },
      { code: 'MAO', name: 'Municipal Assessor\'s Office', headTitle: 'Municipal Assessor' },
      { code: 'MACO', name: 'Municipal Accounting Office', headTitle: 'Municipal Accountant' },
      { code: 'MBO', name: 'Municipal Budget Office', headTitle: 'Municipal Budget Officer' },
      { code: 'MEngr', name: 'Municipal Engineering Office', headTitle: 'Municipal Engineer' },
      { code: 'MHO', name: 'Municipal Health Office', headTitle: 'Municipal Health Officer' },
      { code: 'MSWD', name: 'Municipal Social Welfare & Development Office', headTitle: 'Municipal Social Welfare Officer' },
      { code: 'MAgr', name: 'Municipal Agriculture Office', headTitle: 'Municipal Agriculture Officer' },
      { code: 'MDRRMO', name: 'Municipal DRRM Office', headTitle: 'Municipal DRRM Officer' },
    ],
    support: [
      { code: 'MHRMO', name: 'Municipal Human Resource Management Office', headTitle: 'Municipal HRMO', isHrmOffice: true },
      { code: 'MITO', name: 'Municipal Information Technology Office', headTitle: 'Municipal IT Officer' },
      { code: 'MLegal', name: 'Municipal Legal Office', headTitle: 'Municipal Legal Officer' },
      { code: 'MGSO', name: 'Municipal General Services Office', headTitle: 'Municipal General Services Officer' },
    ],
  },
};

function officeCode(prefix, code, tenantCode) {
  return `${prefix}${code}-${tenantCode}`;
}

async function seedTenant(tenantId, tenantCode, lguLevel, hash) {
  const template = OFFICE_TEMPLATES[lguLevel];
  if (!template) throw new Error(`Unsupported LGU level: ${lguLevel}`);

  const sanggunian = template.legislative[0];
  const governor = template.executive[0];
  const viceGovernor = template.executive[1];
  const hrmo = template.support.find(s => s.isHrmOffice);

  const deptSanggunian = await prisma.department.upsert({
    where: { code: officeCode(template.prefix, sanggunian.code, tenantCode) },
    update: { tenantId },
    create: {
      code: officeCode(template.prefix, sanggunian.code, tenantCode),
      name: sanggunian.name,
      level: 0,
      unitType: 'DEPARTMENT',
      lguOfficeCategory: 'LEGISLATIVE',
      isMandatory: true,
      isHrmOffice: false,
      headTitle: sanggunian.headTitle,
      sanggunianConcurrence: sanggunian.sanggunianConcurrence ?? false,
      concurrenceDate: sanggunian.sanggunianConcurrence ? new Date('2022-11-01') : null,
      concurrenceResolution: sanggunian.sanggunianConcurrence ? `${template.prefix}SP-${tenantCode}-2022-001` : null,
      tenant: { connect: { id: tenantId } },
    },
  });

  const deptGovernor = await prisma.department.upsert({
    where: { code: officeCode(template.prefix, governor.code, tenantCode) },
    update: { tenantId },
    create: {
      code: officeCode(template.prefix, governor.code, tenantCode),
      name: governor.name,
      level: 0,
      unitType: 'DEPARTMENT',
      lguOfficeCategory: 'EXECUTIVE',
      isMandatory: true,
      isHrmOffice: governor.isHrmOffice ?? false,
      headTitle: governor.headTitle,
      tenant: { connect: { id: tenantId } },
    },
  });

  const deptVice = await prisma.department.upsert({
    where: { code: officeCode(template.prefix, viceGovernor.code, tenantCode) },
    update: { tenantId },
    create: {
      code: officeCode(template.prefix, viceGovernor.code, tenantCode),
      name: viceGovernor.name,
      level: 0,
      unitType: 'DEPARTMENT',
      lguOfficeCategory: 'EXECUTIVE',
      isMandatory: true,
      isHrmOffice: viceGovernor.isHrmOffice ?? false,
      headTitle: viceGovernor.headTitle,
      tenant: { connect: { id: tenantId } },
    },
  });

  const deptHR = await prisma.department.upsert({
    where: { code: officeCode(template.prefix, hrmo.code, tenantCode) },
    update: { tenantId },
    create: {
      code: officeCode(template.prefix, hrmo.code, tenantCode),
      name: hrmo.name,
      parent: { connect: { id: deptGovernor.id } },
      level: 1,
      unitType: 'DEPARTMENT',
      lguOfficeCategory: 'SUPPORT_OFFICE',
      isMandatory: true,
      isHrmOffice: true,
      headTitle: hrmo.headTitle,
      sanggunianConcurrence: true,
      concurrenceDate: new Date('2022-11-05'),
      concurrenceResolution: `${template.prefix}SP-${tenantCode}-2022-002`,
      tenant: { connect: { id: tenantId } },
    },
  });

  const deptFinance = await prisma.department.upsert({
    where: { code: officeCode(template.prefix, 'FIN', tenantCode) },
    update: { tenantId },
    create: {
      code: officeCode(template.prefix, 'FIN', tenantCode),
      name: 'Finance Office',
      parent: { connect: { id: deptGovernor.id } },
      level: 1,
      unitType: 'DEPARTMENT',
      lguOfficeCategory: 'SUPPORT_OFFICE',
      isMandatory: true,
      isHrmOffice: false,
      headTitle: `${lguLevel === 'PROVINCIAL' ? 'Provincial' : lguLevel === 'CITY' ? 'City' : 'Municipal'} Accountant`,
      sanggunianConcurrence: true,
      concurrenceDate: new Date('2022-11-05'),
      concurrenceResolution: `${template.prefix}SP-${tenantCode}-2022-003`,
      tenant: { connect: { id: tenantId } },
    },
  });

  const deptAccountingDiv = await prisma.department.upsert({
    where: { code: officeCode(template.prefix, 'ACCTG-DIV', tenantCode) },
    update: { tenantId },
    create: {
      code: officeCode(template.prefix, 'ACCTG-DIV', tenantCode),
      name: 'Accounting Division',
      parent: { connect: { id: deptFinance.id } },
      level: 2,
      unitType: 'DIVISION',
      lguOfficeCategory: 'SUPPORT_OFFICE',
      isMandatory: false,
      isOptional: true,
      isHrmOffice: false,
      headTitle: 'Division Chief',
      tenant: { connect: { id: tenantId } },
    },
  });

  const deptBudgetDiv = await prisma.department.upsert({
    where: { code: officeCode(template.prefix, 'BUDGET-DIV', tenantCode) },
    update: { tenantId },
    create: {
      code: officeCode(template.prefix, 'BUDGET-DIV', tenantCode),
      name: 'Budget Division',
      parent: { connect: { id: deptFinance.id } },
      level: 2,
      unitType: 'DIVISION',
      lguOfficeCategory: 'SUPPORT_OFFICE',
      isMandatory: false,
      isOptional: true,
      isHrmOffice: false,
      headTitle: 'Division Chief',
      tenant: { connect: { id: tenantId } },
    },
  });

  const deptIT = await prisma.department.upsert({
    where: { code: officeCode(template.prefix, 'ITO', tenantCode) },
    update: { tenantId },
    create: {
      code: officeCode(template.prefix, 'ITO', tenantCode),
      name: 'Information Technology Office',
      parent: { connect: { id: deptGovernor.id } },
      level: 1,
      unitType: 'DEPARTMENT',
      lguOfficeCategory: 'SUPPORT_OFFICE',
      isMandatory: false,
      isOptional: true,
      isHrmOffice: false,
      headTitle: 'IT Officer',
      tenant: { connect: { id: tenantId } },
    },
  });

  const deptAdminDiv = await prisma.department.upsert({
    where: { code: officeCode(template.prefix, 'ADMIN-DIV', tenantCode) },
    update: { tenantId },
    create: {
      code: officeCode(template.prefix, 'ADMIN-DIV', tenantCode),
      name: 'Administration Division',
      parent: { connect: { id: deptGovernor.id } },
      level: 2,
      unitType: 'DIVISION',
      lguOfficeCategory: 'SUPPORT_OFFICE',
      isMandatory: true,
      isOptional: false,
      isHrmOffice: false,
      headTitle: 'Division Chief',
      tenant: { connect: { id: tenantId } },
    },
  });

  const deptAdminSec = await prisma.department.upsert({
    where: { code: officeCode(template.prefix, 'ADMIN-SEC', tenantCode) },
    update: { tenantId },
    create: {
      code: officeCode(template.prefix, 'ADMIN-SEC', tenantCode),
      name: 'Administration Section',
      parent: { connect: { id: deptAdminDiv.id } },
      level: 3,
      unitType: 'SECTION',
      lguOfficeCategory: 'SUPPORT_OFFICE',
      isMandatory: false,
      isOptional: true,
      isHrmOffice: false,
      tenant: { connect: { id: tenantId } },
    },
  });

  const deptLegal = await prisma.department.upsert({
    where: { code: officeCode(template.prefix, 'LEGAL', tenantCode) },
    update: { tenantId },
    create: {
      code: officeCode(template.prefix, 'LEGAL', tenantCode),
      name: 'Legal Office',
      parent: { connect: { id: deptGovernor.id } },
      level: 1,
      unitType: 'DEPARTMENT',
      lguOfficeCategory: 'SUPPORT_OFFICE',
      isMandatory: false,
      isOptional: true,
      isHrmOffice: false,
      headTitle: 'Legal Officer',
      tenant: { connect: { id: tenantId } },
    },
  });

  for (const line of template.line) {
    await prisma.department.upsert({
      where: { code: officeCode(template.prefix, line.code, tenantCode) },
      update: { tenantId },
      create: {
        code: officeCode(template.prefix, line.code, tenantCode),
        name: line.name,
        parent: { connect: { id: deptGovernor.id } },
        level: 1,
        unitType: 'DEPARTMENT',
        lguOfficeCategory: 'LINE_OFFICE',
        isMandatory: false,
        isOptional: true,
        isHrmOffice: false,
        headTitle: line.headTitle,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  const roles = ['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD', 'AUDITOR', 'EMPLOYEE'];
  for (const roleName of roles) {
    const existing = await prisma.role.findFirst({ where: { name: roleName, tenantId } });
    if (existing) {
      await prisma.role.update({ where: { id: existing.id }, data: { description: `System role: ${roleName}`, isSystem: true, tenantId } });
    } else {
      await prisma.role.create({ data: { name: roleName, description: `System role: ${roleName}`, isSystem: true, tenantId } });
    }
  }

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
      update: {
        passwordHash: hash,
        passwordChangedAt: new Date(),
        tenant: { connect: { id: tenantId } },
        role: u.role,
      },
      create: {
        username: u.username,
        passwordHash: hash,
        passwordChangedAt: new Date(),
        role: u.role,
        department: { connect: { id: deptGovernor.id } },
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  const posGov = await prisma.position.upsert({
    where: { id: `position-governor-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-governor-${tenantCode}`,
      title: governor.headTitle,
      parentheticalTitle: 'Elected Official',
      iosLguCode: `${template.prefix}GOV-01`,
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
      title: viceGovernor.headTitle,
      parentheticalTitle: 'Elected Official',
      iosLguCode: `${template.prefix}VGOV-01`,
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
      title: sanggunian.headTitle,
      parentheticalTitle: 'Legislative',
      iosLguCode: `${template.prefix}SP-01`,
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
      title: hrmo.headTitle,
      parentheticalTitle: hrmo.name,
      iosLguCode: `${template.prefix}HRM-02`,
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
      iosLguCode: `${template.prefix}ACC-01`,
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
      iosLguCode: `${template.prefix}BDG-01`,
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
      iosLguCode: `${template.prefix}ADM-01`,
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
      iosLguCode: `${template.prefix}IT-01`,
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
      iosLguCode: `${template.prefix}LEG-01`,
      salaryGrade: 24,
      isMandatory: false,
      isCoterminous: true,
      qualificationStandards: 'Law degree; eligible to practice law; 2 years experience.',
      tenant: { connect: { id: tenantId } },
    },
  });

  const plantillaItems = [
    { itemNumber: `PLT-${tenantCode}-GOV-01`, positionId: posGov.id, departmentId: deptGovernor.id, status: 'FILLED', isMandatory: true, itemType: 'NEW_STYLE', salaryGrade: '30', step: '1', sourceOfFund: 'Local Funds', appropriationCode: `2026-${tenantCode}-001`, authorizedSalary: 180000 },
    { itemNumber: `PLT-${tenantCode}-VGOV-01`, positionId: posViceGov.id, departmentId: deptVice.id, status: 'FILLED', isMandatory: true, itemType: 'NEW_STYLE', salaryGrade: '29', step: '1', sourceOfFund: 'Local Funds', appropriationCode: `2026-${tenantCode}-002`, authorizedSalary: 165000 },
    { itemNumber: `PLT-${tenantCode}-SP-01`, positionId: posSanggunian.id, departmentId: deptSanggunian.id, status: 'FILLED', isMandatory: true, itemType: 'NEW_STYLE', salaryGrade: '24', step: '1', sourceOfFund: 'Local Funds', appropriationCode: `2026-${tenantCode}-003`, authorizedSalary: 120000 },
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

  const employeesData = [
    {
      employeeNumber: `EMP-${tenantCode}-0001`,
      firstName: 'Maria',
      lastName: 'Santos',
      middleName: 'L.',
      birthDate: new Date('1990-05-12'),
      gender: 'Female',
      civilStatus: 'Married',
      address: lguLevel === 'PROVINCIAL' ? 'Tarlac City, Tarlac' : lguLevel === 'CITY' ? 'Tarlac City' : 'San Jose, Tarlac',
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
      address: lguLevel === 'PROVINCIAL' ? 'San Jose, Tarlac' : 'Poblacion, Tarlac',
      departmentId: deptFinance.id,
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
      address: lguLevel === 'PROVINCIAL' ? 'Capas, Tarlac' : 'Poblacion, Tarlac',
      departmentId: deptGovernor.id,
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
      address: lguLevel === 'PROVINCIAL' ? 'Camiling, Tarlac' : 'Poblacion, Tarlac',
      departmentId: deptGovernor.id,
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
      address: lguLevel === 'PROVINCIAL' ? 'Tarlac City, Tarlac' : 'Poblacion, Tarlac',
      departmentId: deptFinance.id,
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
      address: lguLevel === 'PROVINCIAL' ? 'Tarlac City, Tarlac' : 'Poblacion, Tarlac',
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
    const yearNow = new Date().getFullYear();
    for (const lt of leaveTypes) {
      await prisma.leaveCredit.upsert({
        where: { tenantId_employeeId_type_year: { tenantId, employeeId: employee.id, type: lt, year: yearNow } },
        update: { balance: 15 },
        create: { employeeId: employee.id, type: lt, balance: 15, year: yearNow, tenantId },
      });
    }
  }

  // Link employee user to their employee record (deferred from user upsert above)
  await prisma.user.updateMany({
    where: { username: `employee-${tenantCode.toLowerCase()}` },
    data: { externalId: `EMP-${tenantCode}-0001` },
  });

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

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const seededEmployees = await prisma.employee.findMany({ where: { tenantId } });
  for (const employee of seededEmployees.slice(0, 3)) {
    const existing = await prisma.attendance.findFirst({
      where: { tenantId, employeeId: employee.id, date: new Date(dateStr) },
    });
    if (existing) continue;
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

    // ── Payroll CSC compliance seed: tardiness, LWOP, overtime ──────────
    const firstEmp = seededEmployees[0];
    const secondEmp = seededEmployees[1];
    const periodStart = new Date(`${currentMonth}-01`);
    const periodEnd   = new Date(`${currentMonth}-30`);

    // Tardy attendance: 08:15 arrival (15min late) for the first employee.
    const tardyDate = periodStart;
    const tardyExisting = await prisma.attendance.findFirst({
      where: { tenantId, employeeId: firstEmp.id, date: tardyDate },
    });
    if (!tardyExisting) {
      await prisma.attendance.create({
        data: {
          employeeId: firstEmp.id,
          date: tardyDate,
          timeIn: new Date(`${currentMonth}-01T08:15:00`),
          timeOut: new Date(`${currentMonth}-01T17:00:00`),
          remark: 'Late 15 min',
          tenantId,
        },
      });
    }

    // Approved LWOP (1 day) for the first employee.
    const lwopDate = periodStart;
    const lwopExisting = await prisma.leaveRequest.findFirst({
      where: { tenantId, employeeId: firstEmp.id, isLwop: true },
    });
    if (!lwopExisting) {
      await prisma.leaveRequest.create({
        data: {
          employeeId: firstEmp.id,
          type: 'VACATION',
          fromDate: lwopDate,
          toDate: lwopDate,
          days: 1,
          status: 'APPROVED',
          isLwop: true,
          reason: 'Personal matter',
          approvedBy: firstEmp.id,
          approvedAt: new Date(),
          tenantId,
        },
      });
    }

    // Approved overtime entries (≥2h).
    const otExisting = await prisma.overtimeRequest.findFirst({ where: { tenantId, employeeId: firstEmp.id } });
    if (!otExisting) {
      await prisma.overtimeRequest.create({
        data: {
          employeeId: firstEmp.id,
          date: periodStart,
          startMins: 1260, // 21:00
          endMins:   1380, // 23:00
          hours: 2,
          type: 'WORKDAY',
          status: 'APPROVED',
          approvedBy: firstEmp.id,
          approvedAt: new Date(),
          notes: 'OT seed: 2h on 1st',
          tenantId,
        },
      });
    }
    const ot2Existing = await prisma.overtimeRequest.findFirst({ where: { tenantId, employeeId: secondEmp.id } });
    if (!ot2Existing) {
      await prisma.overtimeRequest.create({
        data: {
          employeeId: secondEmp.id,
          date: periodStart,
          startMins: 1320, // 22:00
          endMins:   1500, // 01:00 (next day)
          hours: 3,
          type: 'REST_DAY',
          status: 'APPROVED',
          approvedBy: secondEmp.id,
          approvedAt: new Date(),
          notes: 'OT seed: 3h rest-day',
          tenantId,
        },
      });
    }

  // ── Default allowance rules (PERA / RATA / Hazard Pay / Subsistence) ──────
  const allowanceDefaults = [
    { type: 'PERA', amount: 2000 },
    { type: 'RATA', amount: 1500 },
    { type: 'HAZARD_PAY', amount: 0 },
    { type: 'SUBSISTENCE', amount: 0 },
  ];
  for (const rule of allowanceDefaults) {
    const existing = await prisma.allowanceRule.findFirst({ where: { tenantId, type: rule.type } });
    if (!existing) {
      await prisma.allowanceRule.create({
        data: {
          tenantId,
          type: rule.type,
          amount: rule.amount,
          effectiveFrom: new Date(`${currentMonth}-01`),
          active: true,
        },
      });
    }
  }
}

async function main() {
  const hash = await bcrypt.hash(process.env.SEED_DEFAULT_PASSWORD || 'admin123', 10);

  const tenantsData = [
    {
      id: 'tenant-default', code: 'DEFAULT', name: 'Default LGU', lguLevel: 'PROVINCIAL',
      allowedIps: ['127.0.0.1/32', '::1/128', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
    },
    {
      id: 'tenant-solana', code: 'SOLANA', name: 'Municipality of Solana', lguLevel: 'MUNICIPAL',
      allowedIps: ['127.0.0.1/32', '::1/128', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
    },
  ];

  for (const t of tenantsData) {
    await prisma.tenant.upsert({
      where: { code: t.code },
      update: { allowedIps: t.allowedIps },
      create: t,
    });
  }

  for (const t of tenantsData) {
    await seedTenant(t.id, t.code, t.lguLevel, hash);
  }

  // ── Platform SUPER_ADMIN (no tenant — sees all) ──────────────────────
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { passwordHash: hash, passwordChangedAt: new Date() },
    create: {
      username: 'superadmin',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      passwordChangedAt: new Date(),
    },
  });

  console.log('Seed completed successfully');
}

main().catch(e => {
  console.error('Seed failed:', e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
