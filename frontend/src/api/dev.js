import { api } from './client';

export const switchRole = (role, tenantId) => api.post('/dev/switch-role', { role, tenantId }).then(r => r.data);
