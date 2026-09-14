import { api } from './client.js';

export const databaseApi = {
  listTables: () => api.get('/database').then(r => r.data),
  summary: () => api.get('/database/summary').then(r => r.data),
  health: () => api.get('/database/health').then(r => r.data),
  migrations: () => api.get('/database/migrations').then(r => r.data),
  backup: async () => {
    const res = await api.get('/database/backup', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `lgu-hrms-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  dump: async (dataOnly = false) => {
    const res = await api.get('/database/dump', { params: { dataOnly }, responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/sql' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `lgu-hrms-dump-${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  },
  tenantDump: async () => {
    const res = await api.get('/database/tenant-dump', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/sql' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenant-dump-${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  },
  tenantBackup: async () => {
    const res = await api.get('/database/tenant-export', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenant-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  query: (sql, explain = false) => api.post('/database/query', { sql, explain }).then(r => r.data),
  dependents: (name, id) => api.get(`/database/${name}/dependents/${id}`).then(r => r.data),
  importCsv: (name, csv, dryRun = true) => api.post(`/database/${name}/import`, { csv, dryRun }).then(r => r.data),
  retention: (days = 90) => api.get('/database/retention', { params: { days } }).then(r => r.data),
  retentionRun: (scope, days) => api.post('/database/retention/run', { scope, days, confirm: true }).then(r => r.data),
  slowQueries: () => api.get('/database/slow-queries').then(r => r.data),
  connections: () => api.get('/database/connections').then(r => r.data),
  databaseSize: () => api.get('/database/size').then(r => r.data),
  vacuum: (table, analyze = false, verbose = false) => api.post('/database/maintenance/vacuum', { table, analyze, verbose }).then(r => r.data),
  analyze: (table) => api.post('/database/maintenance/analyze', { table }).then(r => r.data),
  reindex: (table, concurrently = true) => api.post('/database/maintenance/reindex', { table, concurrently }).then(r => r.data),
  tenants: () => api.get('/tenants').then(r => r.data),
  createTenant: (data) => api.post('/tenants', data).then(r => r.data),
  tableSchema: (name) => api.get(`/database/${name}/schema`).then(r => r.data),
  browse: (name, params) => api.get(`/database/${name}/browse`, { params }).then(r => r.data),
  getOne: (name, id) => api.get(`/database/${name}/${id}`).then(r => r.data),
  create: (name, data) => api.post(`/database/${name}`, data).then(r => r.data),
  update: (name, id, data) => api.put(`/database/${name}/${id}`, data).then(r => r.data),
  remove: (name, id) => api.delete(`/database/${name}/${id}`),
  exportData: async (name, format = 'csv') => {
    const res = await api.get(`/database/${name}/export`, { params: { format }, responseType: 'blob' });
    const type = format === 'json' ? 'application/json' : 'text/csv';
    const url = URL.createObjectURL(new Blob([res.data], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase()}.${format === 'json' ? 'json' : 'csv'}`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
