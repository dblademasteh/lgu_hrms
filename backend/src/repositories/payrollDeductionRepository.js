import { prisma } from '../lib/prisma.js';
export async function findLinesByItem(payrollItemId){
  return prisma.payrollDeductionLine.findMany({ where:{ payrollItemId } });
}
export async function createLines(payrollItemId, lines){
  return prisma.payrollDeductionLine.createMany({ data: lines.map(l=>({ payrollItemId, ...l })) });
}
export async function upsertPayslip(payrollItemId, pdfUrl=null){
  return prisma.payslip.upsert({
    where:{ payrollItemId },
    update:{ pdfUrl },
    create:{ payrollItemId, pdfUrl }
  });
}
