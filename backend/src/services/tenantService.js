import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import { DEFAULT_PERMISSIONS } from '../shared/permissions.js';

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

export async function seedNewTenant(tenantId, tenantCode, lguLevel) {
  const template = OFFICE_TEMPLATES[lguLevel];
  if (!template) throw new Error(`Unsupported LGU level: ${lguLevel}`);

  const sanggunian = template.legislative[0];
  const governor = template.executive[0];
  const viceGovernor = template.executive[1];
  const hrmo = template.support.find(s => s.isHrmOffice);

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

  const password = `welcome!${Math.floor(Math.random() * 9000 + 1000)}`;
  const hash = await bcrypt.hash(password, 12);

  const adminUsername = `admin-${tenantCode.toLowerCase()}`;
  const adminUser = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash: hash,
      passwordChangedAt: new Date(),
      tenant: { connect: { id: tenantId } },
      role: 'ADMIN',
      department: { connect: { id: deptGovernor.id } },
    },
    create: {
      username: adminUsername,
      passwordHash: hash,
      passwordChangedAt: new Date(),
      role: 'ADMIN',
      department: { connect: { id: deptGovernor.id } },
      tenant: { connect: { id: tenantId } },
    },
  });

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

  await prisma.plantillaItem.upsert({
    where: { itemNumber: `PLT-${tenantCode}-GOV-01` },
    update: { tenantId },
    create: {
      itemNumber: `PLT-${tenantCode}-GOV-01`,
      positionId: posGov.id,
      departmentId: deptGovernor.id,
      status: 'FILLED',
      isMandatory: true,
      itemType: 'NEW_STYLE',
      salaryGrade: '30',
      step: '1',
      sourceOfFund: 'Local Funds',
      appropriationCode: `2026-${tenantCode}-001`,
      authorizedSalary: 180000,
      tenantId,
    },
  });

  await prisma.plantillaItem.upsert({
    where: { itemNumber: `PLT-${tenantCode}-HRM-01` },
    update: { tenantId },
    create: {
      itemNumber: `PLT-${tenantCode}-HRM-01`,
      positionId: posHRMO.id,
      departmentId: deptHR.id,
      status: 'FILLED',
      isMandatory: true,
      itemType: 'NEW_STYLE',
      salaryGrade: '24',
      step: '1',
      sourceOfFund: 'Local Funds',
      appropriationCode: `2026-${tenantCode}-002`,
      authorizedSalary: 120000,
      tenantId,
    },
  });

  return {
    adminUsername,
    password,
    userId: adminUser.id,
  };
}
