import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { assertInTenant } from './tenantRefs.js';

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
export async function createApplicant(req, data){
  if (data.vacancyId) await assertInTenant(req, 'vacancy', data.vacancyId, 'Vacancy');
  if (data.appliedPositionId) await assertInTenant(req, 'position', data.appliedPositionId, 'Position');
  if (data.appliedDepartmentId) await assertInTenant(req, 'department', data.appliedDepartmentId, 'Department');
  return prisma.applicant.create({ data: stampTenant(req, data), include:{ position:true, department:true } });
}
export async function updateApplicant(req, id, data){
  const scope = withTenant(req, { id });
  const existing = await prisma.applicant.findFirst({ where: scope });
  if (!existing) { const e = new Error('Applicant not found'); e.status = 404; throw e; }
  if (data.vacancyId) await assertInTenant(req, 'vacancy', data.vacancyId, 'Vacancy');
  if (data.appliedPositionId) await assertInTenant(req, 'position', data.appliedPositionId, 'Position');
  if (data.appliedDepartmentId) await assertInTenant(req, 'department', data.appliedDepartmentId, 'Department');
  if (data.hiredEmployeeId) await assertInTenant(req, 'employee', data.hiredEmployeeId, 'Employee');
  const stamped = stampTenant(req, data);
  return prisma.applicant.update({ where: scope, data: stamped });
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
export async function createEligibility(req, data){
  await assertInTenant(req, 'employee', data.employeeId, 'Employee');
  return prisma.eligibility.create({ data: stampTenant(req, data), include:{ employee:true } });
}

export async function hireApplicant(req, id, data){
  const scope = withTenant(req, { id });
  const applicant = await prisma.applicant.findFirst({ where: scope, include:{ vacancy:{ include:{ plantillaItem:true } }, position:true, department:true } });
  if (!applicant) { const e = new Error('Applicant not found'); e.status = 404; throw e; }
  if (applicant.status === 'HIRED') {
    const employee = applicant.hiredEmployeeId
      ? await prisma.employee.findFirst({ where: withTenant(req, { id: applicant.hiredEmployeeId }) })
      : null;
    return { applicant, employee };
  }

  const plantillaItemId = applicant.vacancy?.plantillaItemId || null;
  const departmentId = data.departmentId || applicant.appliedDepartmentId || applicant.department?.id || applicant.vacancy?.plantillaItem?.departmentId;
  const positionId = data.positionId || applicant.appliedPositionId || applicant.position?.id || applicant.vacancy?.plantillaItem?.positionId;

  if (!departmentId || !positionId) { const e = new Error('Missing department or position for hiring'); e.status = 400; throw e; }
  if (data.departmentId) await assertInTenant(req, 'department', data.departmentId, 'Department');
  if (data.positionId) await assertInTenant(req, 'position', data.positionId, 'Position');

  let plantillaItem = null;
  if (plantillaItemId) {
    plantillaItem = await prisma.plantillaItem.findFirst({ where: withTenant(req, { id: plantillaItemId }) });
    if (!plantillaItem) { const e = new Error('Plantilla item not found in tenant'); e.status = 404; throw e; }
    if (plantillaItem.status !== 'VACANT') {
      const e = new Error(`Plantilla item ${plantillaItem.itemNumber} is not vacant`);
      e.status = 409;
      e.code = 'PLANTILLA_NOT_VACANT';
      throw e;
    }
  }

  const employeeNumber = data.employeeNumber || `EMP-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const hiredDateStr = data.startDate || new Date().toISOString().slice(0,10);
  const monthlySalary = data.monthlySalary ?? plantillaItem?.authorizedSalary;

  const result = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: stampTenant(req, {
        employeeNumber,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        middleName: applicant.middleName || '',
        birthDate: data.birthDate ? new Date(`${data.birthDate}T00:00:00.000Z`) : new Date('1990-01-01'),
        gender: data.gender || 'OTHER',
        civilStatus: data.civilStatus || 'SINGLE',
        address: data.address || 'TBD',
        contactNumber: data.contactNumber || applicant.phone || null,
        email: data.email || applicant.email || null,
        departmentId,
        positionId,
        hiredDate: new Date(`${hiredDateStr}T00:00:00.000Z`),
        monthlySalary: monthlySalary ?? 0,
        status: 'ACTIVE',
      })
    });

    if (plantillaItemId && plantillaItem) {
      const appointmentType = data.appointmentType || 'PERMANENT';
      await tx.appointment.create({
        data: stampTenant(req, {
          employeeId: employee.id,
          type: appointmentType,
          itemNumber: data.itemNumber || plantillaItem.itemNumber || '',
          plantillaItemId,
          startDate: new Date(`${hiredDateStr}T00:00:00.000Z`),
          status: 'EFFECTIVE',
        })
      });
      await tx.plantillaItem.update({
        where: withTenant(req, { id: plantillaItemId }),
        data: { status: 'FILLED' }
      });
    }

    const updatedApplicant = await tx.applicant.update({
      where: withTenant(req, { id }),
      data: {
        status: 'HIRED',
        hiredEmployeeId: employee.id,
      }
    });

    return { applicant: updatedApplicant, employee };
  });

  return result;
}
