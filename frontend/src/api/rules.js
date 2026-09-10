import { api } from './client.js';

export const rulesApi = {
  listContributions: () => api.get('/rules/contributions'),
  createContribution: (data) => api.post('/rules/contributions', data),
  listTaxBrackets: () => api.get('/rules/tax-brackets'),
  createTaxBracket: (data) => api.post('/rules/tax-brackets', data),
  listLeaveRules: () => api.get('/rules/leave-rules'),
  createLeaveRule: (data) => api.post('/rules/leave-rules', data),
};
