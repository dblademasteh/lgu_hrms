import { api } from './client.js';
export async function getLines(itemId){ const { data } = await api.get(`/payroll-deduction/items/${itemId}/lines`); return data; }
export async function addLines(itemId, lines){ await api.post(`/payroll-deduction/items/${itemId}/lines`, { lines }); }
export async function upsertPayslip(itemId, pdfUrl){ const { data } = await api.post(`/payroll-deduction/items/${itemId}/payslip`, { pdfUrl }); return data; }
