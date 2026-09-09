import * as repo from '../repositories/payrollDeductionRepository.js';
export const getLines = repo.findLinesByItem;
export const addLines = repo.createLines;
export const upsertPayslip = repo.upsertPayslip;
