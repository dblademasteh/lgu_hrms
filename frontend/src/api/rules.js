import { api } from './client.js';

// Contribution/tax rules are read-only here: they were inputs to the local
// payroll engine, which lgu-payroll replaced. The authoritative equivalents
// live in lgu-payroll's deduction catalogue.
export const rulesApi = {
  listContributions: () => api.get('/rules/contributions'),
  listTaxBrackets: () => api.get('/rules/tax-brackets'),
  listLeaveRules: () => api.get('/rules/leave-rules'),
  createLeaveRule: (data) => api.post('/rules/leave-rules', data),
};
