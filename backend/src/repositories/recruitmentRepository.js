import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export async function findApplicants(req, { page=1, limit=50, search, status }){
  let where = withTenant(req, {});
  if(status) where.status = status;
  if(search){
    where.OR = [
      { firstName:{ contains:search, mode:'insensitive' } },
      { lastName:{ contains:search, mode:'insensitive' } },
      { email:{ contains:search, mode:'insensitive' } }
    ];
  }
  const [items,total] = await Promise.all([
    prisma.applicant.findMany({ where, skip:(page-1)*limit, take:limit, include:{ position:true, department:true }, orderBy:{ createdAt:'desc' } }),
    prisma.applicant.count({ where })
  ]);
  return { items, total, page, limit };
}
export async function createApplicant(req, data){ return prisma.applicant.create({ data: stampTenant(req, data), include:{ position:true, department:true } }); }
export async function updateApplicant(req, id, data){
  const scope = withTenant(req, { id });
  const existing = await prisma.applicant.findFirst({ where: scope });
  if (!existing) { const e = new Error('Applicant not found'); e.status = 404; throw e; }
  const stamped = stampTenant(req, data);
  return prisma.applicant.update({ where: { id }, data: stamped });
}
export async function findEligibilities(req, { page=1, limit=50, employeeId }){
  let where = withTenant(req, {});
  if (employeeId) where.employeeId = employeeId;
  const [items,total] = await Promise.all([
    prisma.eligibility.findMany({ where, skip:(page-1)*limit, take:limit, include:{ employee:true }, orderBy:{ createdAt:'desc' } }),
    prisma.eligibility.count({ where })
  ]);
  return { items,total,page,limit };
}
export async function createEligibility(req, data){ return prisma.eligibility.create({ data: stampTenant(req, data), include:{ employee:true } }); }

export async function hireApplicant(req, id, data){
  const scope = withTenant(req, { id });
  const applicant = await prisma.applicant.findFirst({ where: scope, include:{ vacancy:{ include:{ plantillaItem:true } }, position:true, department:true } });
  if (!applicant) { const e = new Error('Applicant not found'); e.status = 404; throw e; }
  if (applicant.status === 'HIRED') return applicant;

  const plantillaItemId = applicant.vacancy?.plantillaItemId || null;
  const departmentId = applicant.appliedDepartmentId || applicant.department?.id || applicant.vacancy?.plantillaItem?.departmentId;
  const positionId = applicant.appliedPositionId || applicant.position?.id || applicant.vacancy?.plantillaItem?.positionId;

  if (!departmentId || !positionId) { const e = new Error('Missing department or position for hiring'); e.status = 400; throw e; }

  const employeeNumber = `EMP-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const hiredDate = new Date().toISOString().slice(0,10);

  const employee = await prisma.employee.create({
    data: stampTenant(req, {
      employeeNumber,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      middleName: applicant.middleName || '',
      birthDate: new Date('1990-01-01'),
      gender: 'OTHER',
      civilStatus: 'SINGLE',
      address: 'TBD',
      contactNumber: applicant.phone || null,
      email: applicant.email || null,
      departmentId,
      positionId,
      hiredDate: new Date(hiredDate),
      monthlySalary: 0,
      status: 'ACTIVE',
    })
  });

  if (plantillaItemId) {
    await prisma.appointment.create({
      data: stampTenant(req, {
        employeeId: employee.id,
        type: 'REGULAR',
        itemNumber: applicant.vacancy?.plantillaItem?.itemNumber || '',
        plantillaItemId,
        startDate: new Date(hiredDate),
        status: 'ACTIVE',
      })
    });
    await prisma.plantillaItem.update({
      where: { id: plantillaItemId },
      data: { status: 'FILLED' }
    });
  }

  const updatedApplicant = await prisma.applicant.update({
    where: { id },
    data: {
      status: 'HIRED',
      hiredEmployeeId: employee.id,
    }
  });

  return { applicant: updatedApplicant, employee };
}
