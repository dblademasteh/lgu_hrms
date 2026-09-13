import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { DEFAULT_PERMISSIONS } from '../src/shared/permissions.js';

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
      positionId: posPayroll.id,
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
      positionId: posAdmin.id,
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
      positionId: posAdmin.id,
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
      positionId: posPayroll.id,
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
      departmentId: deptPGO.id,
      positionId: posAdmin.id,
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

    await prisma.leaveCredit.upsert({
      where: { id: `${employee.id}-VACATION-2026-${tenantCode}` },
      update: { tenantId, balance: 15 },
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
      update: { tenantId, balance: 15 },
      create: {
        id: `${employee.id}-SICK-2026-${tenantCode}`,
        employeeId: employee.id,
        type: 'SICK',
        balance: 15,
        year: 2026,
        tenantId,
      },
    });

    await prisma.leaveCredit.upsert({
      where: { id: `${employee.id}-SPECIAL_PRIVILEGE-2026-${tenantCode}` },
      update: { tenantId, balance: 5 },
      create: {
        id: `${employee.id}-SPECIAL_PRIVILEGE-2026-${tenantCode}`,
        employeeId: employee.id,
        type: 'SPECIAL_PRIVILEGE',
        balance: 5,
        year: 2026,
        tenantId,
      },
    });

    await prisma.leaveCredit.upsert({
      where: { id: `${employee.id}-SPECIAL_WOMEN-2026-${tenantCode}` },
      update: { tenantId, balance: 60 },
      create: {
        id: `${employee.id}-SPECIAL_WOMEN-2026-${tenantCode}`,
        employeeId: employee.id,
        type: 'SPECIAL_WOMEN',
        balance: 60,
        year: 2026,
        tenantId,
      },
    });

    await prisma.leaveCredit.upsert({
      where: { id: `${employee.id}-MATERNITY-2026-${tenantCode}` },
      update: { tenantId, balance: 105 },
      create: {
        id: `${employee.id}-MATERNITY-2026-${tenantCode}`,
        employeeId: employee.id,
        type: 'MATERNITY',
        balance: 105,
        year: 2026,
        tenantId,
      },
    });

    await prisma.leaveCredit.upsert({
      where: { id: `${employee.id}-PATERNITY-2026-${tenantCode}` },
      update: { tenantId, balance: 7 },
      create: {
        id: `${employee.id}-PATERNITY-2026-${tenantCode}`,
        employeeId: employee.id,
        type: 'PATERNITY',
        balance: 7,
        year: 2026,
        tenantId,
      },
    });

    await prisma.leaveCredit.upsert({
      where: { id: `${employee.id}-SOLO_PARENT-2026-${tenantCode}` },
      update: { tenantId, balance: 7 },
      create: {
        id: `${employee.id}-SOLO_PARENT-2026-${tenantCode}`,
        employeeId: employee.id,
        type: 'SOLO_PARENT',
        balance: 7,
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

  await prisma.contributionRule.upsert({
      where: { id: `contribution-sss-${tenantCode}` },
      update: { tenantId },
      create: { id: `contribution-sss-${tenantCode}`, type: 'SSS', employeeRate: 0.045, employerRate: 0.075, effectiveFrom: new Date('2026-01-01'), tenantId },
    });
    await prisma.contributionRule.upsert({
      where: { id: `contribution-phic-${tenantCode}` },
      update: { tenantId },
      create: { id: `contribution-phic-${tenantCode}`, type: 'PHIC', employeeRate: 0.035, employerRate: 0.035, effectiveFrom: new Date('2026-01-01'), tenantId },
    });
    await prisma.contributionRule.upsert({
      where: { id: `contribution-pagibig-${tenantCode}` },
      update: { tenantId },
      create: { id: `contribution-pagibig-${tenantCode}`, type: 'PAGIBIG', employeeRate: 0.02, employerRate: 0.02, effectiveFrom: new Date('2026-01-01'), tenantId },
    });

    const bracketRows = [
      { id: `bracket-0-${tenantCode}`, minIncome: 0, maxIncome: 20833, rate: 0 },
      { id: `bracket-20833-${tenantCode}`, minIncome: 20833, maxIncome: 33333, rate: 0.15 },
      { id: `bracket-33333-${tenantCode}`, minIncome: 33333, maxIncome: 66666, rate: 0.2 },
      { id: `bracket-66666-${tenantCode}`, minIncome: 66666, maxIncome: 166666, rate: 0.25 },
      { id: `bracket-166666-${tenantCode}`, minIncome: 166666, maxIncome: 666666, rate: 0.3 },
      { id: `bracket-666666-${tenantCode}`, minIncome: 666666, maxIncome: null, rate: 0.35 },
    ];
    for (const b of bracketRows) {
      await prisma.taxBracket.upsert({
        where: { id: b.id },
        update: { tenantId },
        create: { ...b, effectiveFrom: new Date('2026-01-01'), tenantId },
      });
    }

    await prisma.attendanceRule.upsert({
      where: { id: `attd-tardiness-${tenantCode}` },
      update: { tenantId },
      create: { id: `attd-tardiness-${tenantCode}`, name: 'Tardiness', tardinessMin: 20, deductionRate: 50, active: true, tenantId },
    });

    await prisma.leaveRuleConfig.upsert({
      where: { id: `leave-vl-${tenantCode}` },
      update: { tenantId },
      create: { id: `leave-vl-${tenantCode}`, leaveType: 'VACATION', accrualPerMonth: 1.25, maxCarryOver: 30, effectiveFrom: new Date('2026-01-01'), tenantId },
    });
    await prisma.leaveRuleConfig.upsert({
      where: { id: `leave-sl-${tenantCode}` },
      update: { tenantId },
      create: { id: `leave-sl-${tenantCode}`, leaveType: 'SICK', accrualPerMonth: 1.25, maxCarryOver: 15, effectiveFrom: new Date('2026-01-01'), tenantId },
    });

    const emp2 = await prisma.employee.findFirst({ where: { employeeNumber: `EMP-${tenantCode}-0002`, tenantId } });
    if (emp2) {
      const loan = await prisma.loan.upsert({
        where: { id: `loan-${tenantCode}-0002` },
        update: { tenantId },
        create: {
          id: `loan-${tenantCode}-0002`,
          employeeId: emp2.id,
          type: 'CASH_LOAN',
          amount: 6000,
          termMonths: 3,
          startDate: new Date('2026-09-01'),
          status: 'DISBURSED',
          tenantId,
        },
      });
      const amortDates = [new Date('2026-09-15'), new Date('2026-10-15'), new Date('2026-11-15')];
      for (let i = 0; i < amortDates.length; i++) {
        await prisma.loanAmortization.upsert({
          where: { id: `amort-${tenantCode}-0002-${i + 1}` },
          update: { tenantId },
          create: { id: `amort-${tenantCode}-0002-${i + 1}`, loanId: loan.id, dueDate: amortDates[i], amount: 2000, paid: false, tenantId },
        });
      }
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
    [`employee-${tenantCode.toLowerCase()}`]: `EMP-${tenantCode}-0006`,
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
