import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedTenant(tenantId, tenantCode, hash) {
  // Departments
  const deptPGO = await prisma.department.upsert({
    where: { code: `PGO-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `PGO-${tenantCode}`,
      name: "Governor's Office",
      level: 0,
      tenantId,
    },
  });

  const deptHR = await prisma.department.upsert({
    where: { code: `HRMO-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `HRMO-${tenantCode}`,
      name: 'Human Resource Management Office',
      parentId: deptPGO.id,
      level: 1,
      tenantId,
    },
  });

  const deptFIN = await prisma.department.upsert({
    where: { code: `FIN-${tenantCode}` },
    update: { tenantId },
    create: {
      code: `FIN-${tenantCode}`,
      name: 'Finance Office',
      parentId: deptPGO.id,
      level: 1,
      tenantId,
    },
  });

  const roles = ['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD', 'AUDITOR'];
  for (const role of roles) {
    await prisma.user.upsert({
      where: { username: `${role.toLowerCase()}-${tenantCode.toLowerCase()}` },
      update: { passwordHash: hash, passwordChangedAt: new Date(), tenantId },
      create: {
        username: `${role.toLowerCase()}-${tenantCode.toLowerCase()}`,
        passwordHash: hash,
        passwordChangedAt: new Date(),
        role,
        departmentId: deptPGO.id,
        tenantId,
      },
    });
  }

  const adminUser = await prisma.user.findUnique({ where: { username: `admin-${tenantCode.toLowerCase()}` } });

  const posHR = await prisma.position.upsert({
    where: { id: `position-hr-officer-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-hr-officer-${tenantCode}`,
      title: 'HR Officer',
      salaryGrade: 15,
      tenantId,
    },
  });

  const posPayroll = await prisma.position.upsert({
    where: { id: `position-payroll-clerk-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-payroll-clerk-${tenantCode}`,
      title: 'Payroll Clerk',
      salaryGrade: 11,
      tenantId,
    },
  });

  const posAdmin = await prisma.position.upsert({
    where: { id: `position-admin-assistant-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `position-admin-assistant-${tenantCode}`,
      title: 'Administrative Assistant',
      salaryGrade: 8,
      tenantId,
    },
  });

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
      positionId: posHR.id,
      hiredDate: new Date('2015-01-15'),
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
      positionId: posPayroll.id,
      hiredDate: new Date('2018-06-01'),
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
      positionId: posAdmin.id,
      hiredDate: new Date('2020-03-10'),
    },
  ];

  for (const emp of employeesData) {
    const employee = await prisma.employee.upsert({
      where: { employeeNumber: emp.employeeNumber },
      update: { tenantId },
      create: { ...emp, tenantId },
    });

    await prisma.leaveCredit.upsert({
      where: { id: `${employee.id}-VACATION-2026-${tenantCode}` },
      update: { tenantId },
      create: {
        id: `${employee.id}-VACATION-2026-${tenantCode}`,
        employeeId: employee.id,
        type: 'VACATION',
        balance: 15,
        year: 2026,
        tenantId,
      },
    });

    await prisma.leaveCredit.upsert({
      where: { id: `${employee.id}-SICK-2026-${tenantCode}` },
      update: { tenantId },
      create: {
        id: `${employee.id}-SICK-2026-${tenantCode}`,
        employeeId: employee.id,
        type: 'SICK',
        balance: 15,
        year: 2026,
        tenantId,
      },
    });

    await prisma.appointment.upsert({
      where: { id: `appointment-${employee.employeeNumber}` },
      update: { tenantId },
      create: {
        id: `appointment-${employee.employeeNumber}`,
        employeeId: employee.id,
        type: 'PERMANENT',
        itemNumber: `PLANTILLA-${employee.employeeNumber}`,
        startDate: emp.hiredDate,
        status: 'ACTIVE',
        position: employee.positionId,
        dept: employee.departmentId,
        tenantId,
      },
    });
  }

  const emp1 = await prisma.employee.findFirst({ where: { employeeNumber: `EMP-${tenantCode}-0001`, tenantId } });
  if (emp1) {
    await prisma.leaveRequest.upsert({
      where: { id: `leave-${emp1.id}-1-${tenantCode}` },
      update: { tenantId },
      create: {
        id: `leave-${emp1.id}-1-${tenantCode}`,
        employeeId: emp1.id,
        type: 'VACATION',
        fromDate: new Date('2026-07-01'),
        toDate: new Date('2026-07-05'),
        days: 5,
        status: 'APPROVED',
        reason: 'Family vacation',
        tenantId,
      },
    });

    await prisma.attendance.createMany({
      skipDuplicates: true,
      data: [
        { employeeId: emp1.id, date: new Date('2026-09-01'), timeIn: new Date('2026-09-01T08:00:00Z'), timeOut: new Date('2026-09-01T17:00:00Z'), hours: 8, tenantId },
        { employeeId: emp1.id, date: new Date('2026-09-02'), timeIn: new Date('2026-09-02T08:05:00Z'), timeOut: new Date('2026-09-02T17:00:00Z'), hours: 7.92, tenantId },
      ],
    });
  }

  const payrollPeriod = await prisma.payrollPeriod.upsert({
    where: { id: `period-2026-09-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `period-2026-09-${tenantCode}`,
      name: 'September 2026',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-30'),
      fiscalYear: 2026,
      tenantId,
    },
  });

  const payrollRun = await prisma.payrollRun.upsert({
    where: { id: `run-2026-09-${tenantCode}` },
    update: { tenantId },
    create: {
      id: `run-2026-09-${tenantCode}`,
      periodId: payrollPeriod.id,
      runDate: new Date('2026-09-30'),
      status: 'DRAFT',
      createdBy: adminUser.id,
      tenantId,
    },
  });

  const allEmployees = await prisma.employee.findMany({ where: { tenantId } });
  for (const e of allEmployees) {
    await prisma.payrollItem.upsert({
      where: { id: `payrollitem-${e.id}-${payrollRun.id}` },
      update: { tenantId },
      create: {
        id: `payrollitem-${e.id}-${payrollRun.id}`,
        employeeId: e.id,
        runId: payrollRun.id,
        basicPay: 25000,
        allowances: 5000,
        deductions: 3000,
        netPay: 27000,
        tenantId,
      },
    });
  }

  const userLinks = {
    [`admin-${tenantCode.toLowerCase()}`]: `EMP-${tenantCode}-0003`,
    [`hr_manager-${tenantCode.toLowerCase()}`]: `EMP-${tenantCode}-0001`,
    [`payroll_officer-${tenantCode.toLowerCase()}`]: `EMP-${tenantCode}-0002`,
  };
  for (const [username, employeeNumber] of Object.entries(userLinks)) {
    await prisma.user.updateMany({ where: { username }, data: { externalId: employeeNumber } });
  }
}

async function main() {
  const password = process.env.SEED_DEFAULT_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);

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

  console.log('Seed completed. Default password:', password);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
