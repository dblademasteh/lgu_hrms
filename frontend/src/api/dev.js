import { api } from './client';

export const switchRole = (role) => api.post('/dev/switch-role', { role }).then(r => r.data);
