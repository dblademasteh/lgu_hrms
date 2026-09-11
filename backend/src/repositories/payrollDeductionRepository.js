import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
export async function findLinesByItem(req, payrollItemId){
  const where = withTenant(req, { payrollItemId });
  return prisma.payrollDeductionLine.findMany({ where });
}
export async function createLines(req, payrollItemId, lines){
  const data = lines.map(l => stampTenant(req, { payrollItemId, ...l }));
  return prisma.payrollDeductionLine.createMany({ data });
}
export async function upsertPayslip(req, payrollItemId, pdfUrl=null){
  const where = withTenant(req, { payrollItemId });
  const existing = await prisma.payslip.findFirst({ where });
  if (existing) {
    return prisma.payslip.update({
      where: { id: existing.id },
      data: stampTenant(req, { pdfUrl })
    });
  }
  return prisma.payslip.create({
    data: stampTenant(req, { payrollItemId, pdfUrl })
  });
}
