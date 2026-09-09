import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_DEFAULT_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);

  const deptPGO = await prisma.department.upsert({
    where: { code: 'PGO' },
    update: {},
    create: {
      code: 'PGO',
      name: "Governor's Office",
      level: 0,
    },
  });

  const deptHR = await prisma.department.upsert({
    where: { code: 'HRMO' },
    update: {},
    create: {
      code: 'HRMO',
      name: 'Human Resource Management Office',
      parentId: deptPGO.id,
      level: 1,
    },
  });

  const deptFIN = await prisma.department.upsert({
    where: { code: 'FIN' },
    update: {},
    create: {
      code: 'FIN',
      name: 'Finance Office',
      parentId: deptPGO.id,
      level: 1,
    },
  });

  const roles = ['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD', 'AUDITOR'];
  for (const role of roles) {
    await prisma.user.upsert({
      where: { username: role.toLowerCase() },
      update: { passwordHash: hash },
      create: {
        username: role.toLowerCase(),
        passwordHash: hash,
        role,
        departmentId: deptPGO.id,
      },
    });
  }

  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });

  const posHR = await prisma.position.upsert({
    where: { id: 'position-hr-officer' },
    update: {},
    create: {
      id: 'position-hr-officer',
      title: 'HR Officer',
      salaryGrade: 15,
    },
  });

  const posPayroll = await prisma.position.upsert({
    where: { id: 'position-payroll-clerk' },
    update: {},
    create: {
      id: 'position-payroll-clerk',
      title: 'Payroll Clerk',
      salaryGrade: 11,
    },
  });

  const posAdmin = await prisma.position.upsert({
    where: { id: 'position-admin-assistant' },
    update: {},
    create: {
      id: 'position-admin-assistant',
      title: 'Administrative Assistant',
      salaryGrade: 8,
    },
  });

  const employeesData = [
    {
      employeeNumber: 'EMP-0001',
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
      employeeNumber: 'EMP-0002',
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
      employeeNumber: 'EMP-0003',
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
      update: {},
      create: emp,
    });

    await prisma.leaveCredit.upsert({
      where: { id: `${employee.id}-VACATION-2026` },
      update: {},
      create: {
        id: `${employee.id}-VACATION-2026`,
        employeeId: employee.id,
        type: 'VACATION',
        balance: 15,
        year: 2026,
      },
    });

    await prisma.leaveCredit.upsert({
      where: { id: `${employee.id}-SICK-2026` },
      update: {},
      create: {
        id: `${employee.id}-SICK-2026`,
        employeeId: employee.id,
        type: 'SICK',
        balance: 15,
        year: 2026,
      },
    });

    await prisma.appointment.upsert({
      where: { id: `appointment-${employee.employeeNumber}` },
      update: {},
      create: {
        id: `appointment-${employee.employeeNumber}`,
        employeeId: employee.id,
        type: 'PERMANENT',
        itemNumber: `PLANTILLA-${employee.employeeNumber}`,
        startDate: emp.hiredDate,
        status: 'ACTIVE',
        position: employee.positionId,
        dept: employee.departmentId,
      },
    });
  }

  const [emp1] = await prisma.employee.findMany({ where: { employeeNumber: 'EMP-0001' } });
  if (emp1) {
    await prisma.leaveRequest.upsert({
      where: { id: 'leave-EMP-0001-1' },
      update: {},
      create: {
        id: 'leave-EMP-0001-1',
        employeeId: emp1.id,
        type: 'VACATION',
        fromDate: new Date('2026-07-01'),
        toDate: new Date('2026-07-05'),
        days: 5,
        status: 'APPROVED',
        reason: 'Family vacation',
      },
    });

    await prisma.attendance.createMany({
      skipDuplicates: true,
      data: [
        { employeeId: emp1.id, date: new Date('2026-09-01'), timeIn: new Date('2026-09-01T08:00:00Z'), timeOut: new Date('2026-09-01T17:00:00Z'), hours: 8 },
        { employeeId: emp1.id, date: new Date('2026-09-02'), timeIn: new Date('2026-09-02T08:05:00Z'), timeOut: new Date('2026-09-02T17:00:00Z'), hours: 7.92 },
      ],
    });
  }

  const payrollPeriod = await prisma.payrollPeriod.upsert({
    where: { id: 'period-2026-09' },
    update: {},
    create: {
      id: 'period-2026-09',
      name: 'September 2026',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-30'),
      fiscalYear: 2026,
    },
  });

  const payrollRun = await prisma.payrollRun.upsert({
    where: { id: 'run-2026-09' },
    update: {},
    create: {
      id: 'run-2026-09',
      periodId: payrollPeriod.id,
      runDate: new Date('2026-09-30'),
      status: 'DRAFT',
      createdBy: adminUser.id,
    },
  });

  const allEmployees = await prisma.employee.findMany();
  for (const e of allEmployees) {
    await prisma.payrollItem.upsert({
      where: { id: `payrollitem-${e.id}-${payrollRun.id}` },
      update: {},
      create: {
        id: `payrollitem-${e.id}-${payrollRun.id}`,
        employeeId: e.id,
        runId: payrollRun.id,
        basicPay: 25000,
        allowances: 5000,
        deductions: 3000,
        netPay: 27000,
      },
    });
  }

  // Link users to employees for ESS access (User.externalId = Employee.employeeNumber).
  // One employee per user; department_head/auditor stay unlinked (pure staff accounts).
  const userLinks = {
    admin: 'EMP-0003',           // Ana Reyes, Administrative Assistant
    hr_manager: 'EMP-0001',      // Maria Santos, HR Officer
    payroll_officer: 'EMP-0002', // Juan Dela Cruz, Payroll Clerk
  };
  for (const [username, employeeNumber] of Object.entries(userLinks)) {
    await prisma.user.updateMany({ where: { username }, data: { externalId: employeeNumber } });
  }

  console.log('Seed completed. Default password:', password);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
