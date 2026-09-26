import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Database, Download, Upload, RefreshCw, Activity, HardDrive,
  Clock, AlertTriangle, CheckCircle2, XCircle, Play, Table, Zap
} from 'lucide-react';
import Layout from '../components/Layout.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { databaseApi } from '../api/database.js';

const SIZE_TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'backup', label: 'Backup & Restore', icon: Download },
  { id: 'migrations', label: 'Migrations', icon: RefreshCw },
  { id: 'maintenance', label: 'Maintenance', icon: Zap },
  { id: 'monitoring', label: 'Monitoring', icon: Activity },
];

export default function DatabaseTools() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [migrations, setMigrations] = useState(null);
  const [slowQueries, setSlowQueries] = useState(null);
  const [connections, setConnections] = useState(null);
  const [databaseSize, setDatabaseSize] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({ vacuumRun: false, vacuumAnalyze: false, analyze: false, reindex: false });
  const [maintenanceResult, setMaintenanceResult] = useState(null);
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [confirmRunMigrations, setConfirmRunMigrations] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [healthRes, summaryRes, migrationsRes, slowRes, connRes, sizeRes, tablesRes] = await Promise.all([
        databaseApi.health().catch(() => null),
        databaseApi.summary().catch(() => null),
        databaseApi.migrations().catch(() => null),
        databaseApi.slowQueries().catch(() => null),
        databaseApi.connections().catch(() => null),
        databaseApi.databaseSize().catch(() => null),
        databaseApi.listTables().catch(() => []),
      ]);
      setHealth(healthRes);
      setSummary(summaryRes);
      setMigrations(migrationsRes);
      setSlowQueries(slowRes);
      setConnections(connRes);
      setDatabaseSize(sizeRes);
      setTables(tablesRes || []);
    } catch (e) {
      toast('Failed to load database info', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const runMigrations = async () => {
    setMigrationRunning(true);
    setConfirmRunMigrations(false);
    try {
      const res = await databaseApi.runMigrations();
      toast(res.message || 'Migrations applied', res.inSync === false ? 'error' : 'success');
      await loadAll();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Migration failed', 'error');
    } finally {
      setMigrationRunning(false);
    }
  };

  const runBackup = async () => {
    try {
      await databaseApi.backup();
      toast('JSON backup downloaded', 'success');
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Backup failed', 'error');
    }
  };
  const runDump = async (dataOnly = false) => {
    try {
      await databaseApi.dump(dataOnly);
      toast(dataOnly ? 'Data-only SQL dump started' : 'SQL dump started', 'success');
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Dump unavailable', 'error');
    }
  };

  const runMaintenance = async (action, payload = {}) => {
    const loadingKey = action === 'vacuum' ? (payload.analyze ? 'vacuumAnalyze' : 'vacuumRun') : action;
    setActionLoading(prev => ({ ...prev, [loadingKey]: true }));
    setMaintenanceResult(null);
    try {
      let result;
      switch (action) {
        case 'vacuum':
          result = await databaseApi.vacuum(payload.table, payload.analyze, payload.verbose);
          break;
        case 'analyze':
          result = await databaseApi.analyze(payload.table);
          break;
        case 'reindex':
          result = await databaseApi.reindex(payload.table, payload.concurrently);
          break;
        default:
          break;
      }
      toast(`${action} completed successfully`, 'success');
      setMaintenanceResult({ action, success: true, result });
      await loadAll();
    } catch (e) {
      toast(`${action} failed: ${e?.response?.data?.error?.message || e.message}`, 'error');
      setMaintenanceResult({ action, success: false, error: e?.response?.data?.error?.message || e.message });
    } finally {
      setActionLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatUptime = (uptime) => {
    if (!uptime) return '—';
    const parts = uptime.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parts[2].split('.')[0];
      if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
      if (minutes > 0) return `${minutes}m ${seconds}s`;
      return `${seconds}s`;
    }
    return uptime;
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="text-accent" size={16} />
            <span className="mono-label text-[10px] uppercase text-muted">Status</span>
          </div>
          <div className="flex items-center gap-2">
            {health?.ok ? (
              <CheckCircle2 size={20} className="text-success" />
            ) : (
              <XCircle size={20} className="text-error" />
            )}
            <p className="font-display text-lg font-bold text-ink">
              {health?.ok ? 'Healthy' : 'Unhealthy'}
            </p>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="text-accent" size={16} />
            <span className="mono-label text-[10px] uppercase text-muted">Database Size</span>
          </div>
          <p className="font-display text-lg font-bold text-ink">
            {formatBytes(databaseSize?.totalBytes)}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-accent" size={16} />
            <span className="mono-label text-[10px] uppercase text-muted">Uptime</span>
          </div>
          <p className="font-display text-lg font-bold text-ink">
            {formatUptime(health?.uptime)}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="text-accent" size={16} />
            <span className="mono-label text-[10px] uppercase text-muted">Latency</span>
          </div>
          <p className="font-display text-lg font-bold text-ink">
            {health?.latencyMs != null ? `${health.latencyMs}ms` : '—'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display font-semibold text-ink mb-4">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="card p-4 hover:border-accent/40 transition-colors text-left"
              onClick={runBackup}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 text-success grid place-items-center">
                  <Download size={20} />
                </div>
                <div>
                  <p className="font-display font-semibold text-ink text-sm">Download Backup</p>
                  <p className="text-xs text-muted mt-0.5">JSON snapshot</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              className="card p-4 hover:border-accent/40 transition-colors text-left"
              onClick={() => runDump(false)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent grid place-items-center">
                  <Download size={20} />
                </div>
                <div>
                  <p className="font-display font-semibold text-ink text-sm">SQL Dump</p>
                  <p className="text-xs text-muted mt-0.5">Full schema + data</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              className="card p-4 hover:border-accent/40 transition-colors text-left"
              onClick={() => setActiveTab('maintenance')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 text-warning grid place-items-center">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="font-display font-semibold text-ink text-sm">Maintenance</p>
                  <p className="text-xs text-muted mt-0.5">Vacuum, analyze, reindex</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              className="card p-4 hover:border-accent/40 transition-colors text-left"
              onClick={loadAll}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent grid place-items-center">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <p className="font-display font-semibold text-ink text-sm">Refresh</p>
                  <p className="text-xs text-muted mt-0.5">Reload all metrics</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-display font-semibold text-ink mb-4">Database Info</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Version</span>
              <span className="font-mono text-xs text-ink">{health?.version?.split(' on ')[0] || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Size</span>
              <span className="font-mono text-xs text-ink">{formatBytes(databaseSize?.totalBytes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Uptime</span>
              <span className="font-mono text-xs text-ink">{formatUptime(health?.uptime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Connections</span>
              <span className="font-mono text-xs text-ink">{connections?.total ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Tables</span>
              <span className="font-mono text-xs text-ink">{tables.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Total Records</span>
              <span className="font-mono text-xs text-ink">
                {summary?.totalRecords?.toLocaleString() || '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Checked At</span>
              <span className="font-mono text-xs text-ink">
                {health?.checkedAt ? new Date(health.checkedAt).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackup = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-success/10 text-success grid place-items-center">
              <Download size={20} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-ink">JSON Backup</h3>
              <p className="text-xs text-muted">Download a full snapshot of all managed tables</p>
            </div>
          </div>
          <p className="text-sm text-muted mb-4">
            Exports all managed tables as a single JSON file. Sensitive fields (passwords, PINs, 2FA secrets) are stripped.
          </p>
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={runBackup}
          >
            <Download size={16} />
            Download JSON Backup
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent grid place-items-center">
              <Download size={20} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-ink">SQL Dump</h3>
              <p className="text-xs text-muted">Restorable SQL file via pg_dump</p>
            </div>
          </div>
          <p className="text-sm text-muted mb-4">
            Generates a true PostgreSQL dump using pg_dump. This is the preferred format for full restores.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline flex-1"
              onClick={() => runDump(false)}
            >
              <Download size={16} />
              Full Dump
            </button>
            <button
              type="button"
              className="btn btn-outline flex-1"
              onClick={() => runDump(true)}
            >
              <Upload size={16} />
              Data Only
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-display font-semibold text-ink mb-3">Backup Guidelines</h3>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li>Store backups offsite or in a separate storage system</li>
          <li>Test restores monthly to ensure backup integrity</li>
          <li>Keep at least 7 days of daily backups</li>
          <li>JSON backups are for data inspection; use SQL dumps for actual restores</li>
        </ul>
      </div>
    </div>
  );

  const renderMigrations = () => (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-ink">Migration Status</h2>
          <div className="flex items-center gap-2">
            {migrations?.inSync ? (
              <span className="badge badge-success">In Sync</span>
            ) : (
              <span className="badge badge-error">{migrations?.pendingCount} Pending</span>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="card p-4">
            <p className="mono-label text-[10px] uppercase text-muted mb-1">Applied</p>
            <p className="font-display text-2xl font-bold text-ink">{migrations?.appliedCount || 0}</p>
          </div>
          <div className="card p-4">
            <p className="mono-label text-[10px] uppercase text-muted mb-1">Pending</p>
            <p className="font-display text-2xl font-bold text-ink">{migrations?.pendingCount || 0}</p>
          </div>
          <div className="card p-4">
            <p className="mono-label text-[10px] uppercase text-muted mb-1">Last Applied</p>
            <p className="font-display text-lg font-bold text-ink">
              {migrations?.lastApplied ? new Date(migrations.lastApplied).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {migrations?.pending?.length > 0 && (
          <div className="card p-4 border-warning/20 bg-warning/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-warning" />
              <p className="font-display font-semibold text-ink">Pending Migrations</p>
            </div>
            <p className="text-sm text-muted mb-3">
              {migrations.pending.length} migration{migrations.pending.length !== 1 ? 's' : ''} ready to apply.
            </p>
            <div className="space-y-1 mb-4">
              {migrations.pending.map(name => (
                <div key={name} className="font-mono text-xs text-ink bg-bg px-2 py-1 rounded">
                  {name}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-warning gap-2"
              disabled={migrationRunning}
              onClick={() => setConfirmRunMigrations(true)}
            >
              {migrationRunning ? 'Running…' : 'Apply Migrations'}
            </button>
          </div>
        )}

        {migrations?.history?.length > 0 && (
          <div className="mt-6">
            <h3 className="font-display font-semibold text-ink mb-3">Recent Migrations</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Migration</th>
                    <th>Started</th>
                    <th>Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {migrations.history.slice(-10).reverse().map(m => (
                    <tr key={m.name}>
                      <td className="font-mono text-sm">{m.name}</td>
                      <td className="text-sm text-muted">
                        {m.startedAt ? new Date(m.startedAt).toLocaleString() : '—'}
                      </td>
                      <td className="text-sm text-muted">
                        {m.finishedAt ? new Date(m.finishedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMaintenance = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent grid place-items-center">
              <RefreshCw size={20} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-ink">VACUUM</h3>
              <p className="text-xs text-muted">Clean up dead tuples</p>
            </div>
          </div>
          <p className="text-sm text-muted mb-4">
            Reclaims storage from deleted rows and updates statistics. Use ANALYZE flag to also update query planner stats.
          </p>
          <div className="space-y-2">
            <button
              type="button"
              className="btn btn-outline w-full"
              onClick={() => runMaintenance('vacuum', { table: '', analyze: false, verbose: false })}
              disabled={actionLoading.vacuumRun}
            >
              <Play size={16} />
              {actionLoading.vacuumRun ? 'Running…' : 'VACUUM'}
            </button>
            <button
              type="button"
              className="btn btn-outline w-full"
              onClick={() => runMaintenance('vacuum', { table: '', analyze: true, verbose: false })}
              disabled={actionLoading.vacuumAnalyze}
            >
              <Play size={16} />
              {actionLoading.vacuumAnalyze ? 'Running…' : 'VACUUM ANALYZE'}
            </button>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-success/10 text-success grid place-items-center">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-ink">ANALYZE</h3>
              <p className="text-xs text-muted">Update statistics</p>
            </div>
          </div>
          <p className="text-sm text-muted mb-4">
            Updates the query planner statistics for better query performance. Run after large data changes.
          </p>
          <button
            type="button"
            className="btn btn-outline w-full"
            onClick={() => runMaintenance('analyze', { table: '' })}
            disabled={actionLoading.analyze}
          >
            <Play size={16} />
            {actionLoading.analyze ? 'Running…' : 'ANALYZE'}
          </button>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-warning/10 text-warning grid place-items-center">
              <RefreshCw size={20} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-ink">REINDEX</h3>
              <p className="text-xs text-muted">Rebuild indexes</p>
            </div>
          </div>
          <p className="text-sm text-muted mb-4">
            Rebuilds indexes to improve query performance. Whole-database reindex runs without CONCURRENTLY (it locks), so schedule it off-peak. Enter a table name below for a concurrent per-table reindex.
          </p>
          <button
            type="button"
            className="btn btn-outline w-full"
            onClick={() => runMaintenance('reindex', { table: '', concurrently: true })}
            disabled={actionLoading.reindex}
          >
            <Play size={16} />
            {actionLoading.reindex ? 'Running…' : 'REINDEX DATABASE'}
          </button>
        </div>
      </div>

      {maintenanceResult && (
        <div className={`p-3 rounded-lg border ${maintenanceResult.success ? 'border-success/30 bg-success/5' : 'border-error/30 bg-error/5'}`}>
          <p className="text-sm text-ink">
            {maintenanceResult.success ? 'Maintenance completed' : 'Maintenance failed'}
            {maintenanceResult.result?.sql && <span className="font-mono text-xs text-muted ml-2">{maintenanceResult.result.sql}</span>}
          </p>
          {maintenanceResult.error && <p className="text-xs text-error mt-1">{maintenanceResult.error}</p>}
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-display font-semibold text-ink mb-3">Maintenance Schedule</h3>
        <div className="text-sm text-muted space-y-1">
          <p>• <strong>VACUUM</strong> — Run weekly or after large deletions</p>
          <p>• <strong>ANALYZE</strong> — Run weekly or after bulk inserts/updates</p>
          <p>• <strong>REINDEX</strong> — Run monthly or when queries slow down</p>
          <p>• All operations can be run on specific tables by entering the table name in the advanced options</p>
        </div>
      </div>
    </div>
  );

  const renderMonitoring = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-display font-semibold text-ink mb-4">Connections</h3>
          {connections ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted">Total Connections</span>
                <span className="font-display text-xl font-bold text-ink">{connections.total}</span>
              </div>
              {connections.states && Object.entries(connections.states).map(([state, count]) => (
                <div key={state} className="flex justify-between items-center">
                  <span className="text-sm text-muted capitalize">{state || 'unknown'}</span>
                  <span className="font-mono text-sm text-ink">{count}</span>
                </div>
              ))}
              {connections.oldestConnection && (
                <div className="flex justify-between items-center pt-2 border-t border-line">
                  <span className="text-sm text-muted">Oldest Connection</span>
                  <span className="font-mono text-xs text-ink">
                    {new Date(connections.oldestConnection).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Unable to load connection info</p>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-display font-semibold text-ink mb-4">Slow Queries</h3>
          {slowQueries?.available ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Calls</th>
                    <th>Total</th>
                    <th>Mean</th>
                  </tr>
                </thead>
                <tbody>
                  {slowQueries.queries?.map((q, i) => (
                    <tr key={i}>
                      <td className="font-mono text-xs max-w-xs truncate" title={q.query}>{q.query}</td>
                      <td className="text-sm">{q.calls}</td>
                      <td className="text-sm">{q.totalMs}ms</td>
                      <td className="text-sm">{q.meanMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">{slowQueries?.hint || 'No slow query data available'}</p>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-display font-semibold text-ink mb-4">Table Sizes (Top 20)</h3>
        {databaseSize?.tables?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Schema</th>
                  <th>Table</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {databaseSize.tables.map((t, i) => (
                  <tr key={i}>
                    <td className="font-mono text-sm">{t.schema}</td>
                    <td className="font-mono text-sm">{t.table}</td>
                    <td className="text-sm">{t.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">No size data available</p>
        )}
      </div>
    </div>
  );

  return (
    <Layout maxWidth="max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Database size={20} className="text-accent" />
            Database Tools
          </h1>
          <p className="text-sm text-muted mt-0.5">Backup, maintenance, and monitoring</p>
        </div>
        <button
          type="button"
          className="btn btn-outline gap-2"
          onClick={loadAll}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-line overflow-x-auto">
        {SIZE_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="flex items-center gap-1.5">
              <tab.icon size={14} />
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-muted">Loading database information…</div>
      ) : (
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'backup' && renderBackup()}
          {activeTab === 'migrations' && renderMigrations()}
          {activeTab === 'maintenance' && renderMaintenance()}
          {activeTab === 'monitoring' && renderMonitoring()}
        </div>
      )}

      <ConfirmDialog
        open={confirmRunMigrations}
        onClose={() => setConfirmRunMigrations(false)}
        onConfirm={runMigrations}
        title="Apply pending migrations?"
        message="This will run `prisma migrate deploy` on the production database. This operation is irreversible — ensure you have a recent backup. Continue?"
        confirmLabel="Apply"
        danger
      />
    </Layout>
  );
}
