import * as repo from '../repositories/payrollDeductionRepository.js';
export async function getLines(req, payrollItemId) {
  return repo.findLinesByItem(req, payrollItemId);
}
export async function addLines(req, payrollItemId, lines) {
  return repo.createLines(req, payrollItemId, lines);
}
export async function upsertPayslip(req, payrollItemId, pdfUrl) {
  return repo.upsertPayslip(req, payrollItemId, pdfUrl);
}
