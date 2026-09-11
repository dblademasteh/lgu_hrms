import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

// Tables that are safe to inspect — synced with prisma/schema.prisma (42 models).
// Audit-adjacent tables are read-only: the trail must stay append-only.
const MANAGED_TABLES = [
  { name: 'User', label: 'Users', description: 'System users with roles and auth' },
  { name: 'Department', label: 'Departments', description: 'Organizational units' },
  { name: 'Employee', label: 'Employees', description: 'Employee master records' },
  { name: 'Position', label: 'Positions', description: 'Job positions & salary grades' },
  { name: 'FamilyMember', label: 'Family Members', description: 'CSC Form 212 family background' },
  { name: 'EducationRecord', label: 'Education', description: 'Educational background records' },
  { name: 'Award', label: 'Awards', description: 'Recognition & awards' },
  { name: 'EmploymentHistory', label: 'Employment History', description: 'Service record entries' },
  { name: 'PayrollPeriod', label: 'Payroll Periods', description: 'Defined payroll periods' },
  { name: 'PayrollRun', label: 'Payroll Runs', description: 'Generated payroll runs' },
  { name: 'PayrollItem', label: 'Payroll Items', description: 'Per-employee run lines' },
  { name: 'PayrollDeductionLine', label: 'Deduction Lines', description: 'Itemized deductions' },
  { name: 'Payslip', label: 'Payslips', description: 'Generated payslips' },
  { name: 'LedgerEntry', label: 'Ledger Entries', description: 'COA ledger postings' },
  { name: 'AuditLog', label: 'Audit Logs', description: 'Append-only audit trail' },
  { name: 'UserSession', label: 'Sessions', description: 'Active login sessions' },
  { name: 'LoginEvent', label: 'Login Events', description: 'Authentication history' },
  { name: 'Delegation', label: 'Delegations', description: 'Authority delegations' },
  { name: 'LeaveRequest', label: 'Leave Requests', description: 'Employee leave requests' },
  { name: 'LeaveCredit', label: 'Leave Credits', description: 'Leave balances by type/year' },
  { name: 'Attendance', label: 'Attendance', description: 'Time and attendance records' },
  { name: 'Appointment', label: 'Appointments', description: 'CSC appointment records' },
  { name: 'PerformanceReview', label: 'Performance Reviews', description: 'IPCR/OPCR reviews' },
  { name: 'PlantillaItem', label: 'Plantilla Items', description: 'Approved staffing positions' },
  { name: 'Vacancy', label: 'Vacancies', description: 'Open position vacancies' },
  { name: 'VacancyPublication', label: 'Vacancy Publications', description: 'Posting channels' },
  { name: 'DesignationOrder', label: 'Designation Orders', description: 'Temporary designation orders' },
  { name: 'TrainingProgram', label: 'Training Programs', description: 'Learning programs' },
  { name: 'TrainingEnrollment', label: 'Enrollments', description: 'Training enrollments' },
  { name: 'Eligibility', label: 'Eligibilities', description: 'CSC eligibilities' },
  { name: 'Disqualification', label: 'DIBAR Records', description: 'Disqualification/bar records' },
  { name: 'Applicant', label: 'Applicants', description: 'Recruitment applicants' },
  { name: 'Interview', label: 'Interviews', description: 'Applicant interviews' },
  { name: 'ContributionRule', label: 'Contribution Rules', description: 'GSIS/Pag-IBIG/PhilHealth tables' },
  { name: 'TaxBracket', label: 'Tax Brackets', description: 'Withholding tax brackets' },
  { name: 'LeaveRuleConfig', label: 'Leave Rules', description: 'Leave accrual configuration' },
  { name: 'Bonus', label: 'Bonuses', description: 'Bonus records' },
  { name: 'Loan', label: 'Loans', description: 'Employee loan records' },
  { name: 'LoanAmortization', label: 'Amortizations', description: 'Loan repayment schedules' },
  { name: 'AttendanceRule', label: 'Attendance Rules', description: 'DTR thresholds & rules' },
  { name: 'Competency', label: 'Competencies', description: 'Competency catalog' },
  { name: 'IDP', label: 'IDPs', description: 'Individual development plans' },
];

// System-generated tables: browse/export allowed, mutations blocked to
// preserve the append-only trail and generated payroll artifacts.
const READ_ONLY_TABLES = ['AuditLog', 'UserSession', 'LoginEvent', 'Payslip', 'LedgerEntry'];

// Prisma client delegates are camelCase (model User -> prisma.user).
function delegate(name) {
  const key = name.charAt(0).toLowerCase() + name.slice(1);
  return prisma[key];
}

function isManaged(name) {
  return MANAGED_TABLES.some(t => t.name === name);
}

function withMeta(t, extra = {}) {
  return { ...t, readOnly: READ_ONLY_TABLES.includes(t.name), ...extra };
}

// Fields that must never be returned to the client
const SENSITIVE_FIELDS = ['passwordHash', 'pinHash', 'twoFactorSecret', 'passwordResetToken'];

// Tables that use soft delete via a `deletedAt` column
const SOFT_DELETE_TABLES = ['Employee'];

// Filter sensitive fields from a single record
function _filterSensitive(record) {
  const clean = {};
  for (const [key, val] of Object.entries(record)) {
    if (!SENSITIVE_FIELDS.includes(key)) clean[key] = val;
  }
  return clean;
}

export const databaseController = {
  // List all managed tables with row counts
  async listTables(req, res) {
    const results = [];
    for (const t of MANAGED_TABLES) {
      try {
        const count = await delegate(t.name).count({ where: withTenant(req) });
        results.push(withMeta(t, { rowCount: Number(count) }));
      } catch {
        results.push(withMeta(t, { rowCount: -1 }));
      }
    }
    res.json(results);
  },

  // Get schema info for a table (column names + types)
  async tableSchema(req, res) {
    const { name } = req.params;
    if (!MANAGED_TABLES.some(t => t.name === name)) {
      return res.status(400).json({ error: `Unknown table: ${name}` });
    }
    const columns = await prisma.$queryRawUnsafe(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
      name
    );
    res.json(columns);
  },

  // Browse records with pagination
  async browse(req, res) {
    const { name } = req.params;
    const { skip = '0', take = '20', orderBy = 'id', order = 'desc' } = req.query;
    if (!isManaged(name)) {
      return res.status(400).json({ error: `Unknown table: ${name}` });
    }

    const skipNum = Math.max(0, Number(skip));
    const takeNum = Math.min(100, Math.max(1, Number(take)));
    const orderStr = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const model = delegate(name);
    const where = withTenant(req);
    const [data, count] = await Promise.all([
      model.findMany({
        where,
        skip: skipNum,
        take: takeNum,
        orderBy: { [orderBy]: orderStr },
      }),
      model.count({ where }),
    ]);

    res.json({ data: data.map(_filterSensitive), count, skip: skipNum, take: takeNum });
  },

  // Get a single record
  async getOne(req, res) {
    const { name, id } = req.params;
    if (!isManaged(name)) {
      return res.status(400).json({ error: `Unknown table: ${name}` });
    }
    const where = withTenant(req, { id: Number(id) || id });
    const record = await delegate(name).findFirst({ where });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(_filterSensitive(record));
  },

  // Create / insert a record
  async create(req, res) {
    const { name } = req.params;
    if (!isManaged(name)) {
      return res.status(400).json({ error: `Unknown table: ${name}` });
    }
    if (READ_ONLY_TABLES.includes(name)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: `${name} is read-only` } });
    }
    const payload = stampTenant(req, req.body);
    try {
      const created = await delegate(name).create({ data: payload });
      res.status(201).json(_filterSensitive(created));
    } catch (e) {
      if (e.code === 'P2002') return res.status(409).json({ error: `Duplicate key: ${e.meta?.target}` });
      res.status(400).json({ error: e.message });
    }
  },

  // Update an existing record
  async update(req, res) {
    const { name, id } = req.params;
    if (!isManaged(name)) {
      return res.status(400).json({ error: `Unknown table: ${name}` });
    }
    if (READ_ONLY_TABLES.includes(name)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: `${name} is read-only` } });
    }
    const payload = stampTenant(req, req.body);
    try {
      // Scope check
      const where = withTenant(req, { id: Number(id) || id });
      const exists = await delegate(name).findFirst({ where });
      if (!exists) return res.status(404).json({ error: 'Record not found' });
      const updated = await delegate(name).update({
        where: { id: Number(id) || id },
        data: payload,
      });
      res.json(_filterSensitive(updated));
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
      if (e.code === 'P2002') return res.status(409).json({ error: `Duplicate key: ${e.meta?.target}` });
      res.status(400).json({ error: e.message });
    }
  },

  // Delete a record (soft delete where deleted_at exists)
  async remove(req, res) {
    const { name, id } = req.params;
    if (!isManaged(name)) {
      return res.status(400).json({ error: `Unknown table: ${name}` });
    }
    if (READ_ONLY_TABLES.includes(name)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: `${name} is read-only` } });
    }
    try {
      const model = delegate(name);
      const where = withTenant(req, { id: Number(id) || id });
      const exists = await model.findFirst({ where });
      if (!exists) return res.status(404).json({ error: 'Record not found' });
      const hasSoftDelete = SOFT_DELETE_TABLES.includes(name);
      if (hasSoftDelete) {
        await model.update({
          where: { id: Number(id) || id },
          data: { deletedAt: new Date() },
        });
      } else {
        await model.delete({ where: { id: Number(id) || id } });
      }
      res.status(204).send();
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
      throw e;
    }
  },

  // Export table data as CSV or JSON
  async exportData(req, res) {
    const { name } = req.params;
    const { format = 'csv' } = req.query;
    if (!isManaged(name)) {
      return res.status(400).json({ error: `Unknown table: ${name}` });
    }

    const records = await delegate(name).findMany({ where: withTenant(req) });
    const filtered = records.map(_filterSensitive);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${name.toLowerCase()}.json"`);
      return res.json(filtered);
    }

    if (filtered.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${name.toLowerCase()}.csv"`);
      return res.send('');
    }

    const columns = Object.keys(filtered[0]);
    const csvRows = [columns.join(',')];
    for (const row of filtered) {
      const values = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${name.toLowerCase()}.csv"`);
    res.send(csvRows.join('\n'));
  },

  // Table counts summary
  async summary(req, res) {
    const entries = await Promise.all(
      MANAGED_TABLES.map(async (t) => {
        try {
          const count = await delegate(t.name).count({ where: withTenant(req) });
          return withMeta(t, { count: Number(count) });
        } catch {
          return withMeta(t, { count: -1 });
        }
      })
    );
    const totalRecords = entries.reduce((sum, e) => sum + Math.max(0, e.count), 0);
    res.json({ tables: entries, totalTables: entries.length, totalRecords });
  },

  // ---- Ops: health / migrations / backup (read-side safe) ----

  // Connection + server vitals: latency, version, DB size, uptime.
  async health(req, res, next) {
    try {
      const started = Date.now();
      const [versionRow, sizeRow, uptimeRow] = await Promise.all([
        prisma.$queryRawUnsafe(`SELECT version() AS v`),
        prisma.$queryRawUnsafe(`SELECT pg_database_size(current_database())::bigint AS bytes`),
        prisma.$queryRawUnsafe(`SELECT date_trunc('second', now() - pg_postmaster_start_time())::text AS uptime`),
      ]);
      const latencyMs = Date.now() - started;
      res.json({
        ok: true,
        latencyMs,
        version: versionRow?.[0]?.v ?? null,
        sizeBytes: sizeRow?.[0]?.bytes != null ? Number(sizeRow[0].bytes) : null,
        uptime: uptimeRow?.[0]?.uptime ?? null,
        checkedAt: new Date().toISOString(),
      });
    } catch (e) { next(e); }
  },

  // Applied Prisma migrations vs. files on disk.
  async migrations(req, res, next) {
    try {
      let applied = [];
      try {
        applied = await prisma.$queryRawUnsafe(
          `SELECT migration_name, started_at AS "startedAt", finished_at AS "finishedAt"
           FROM _prisma_migrations ORDER BY finished_at NULLS LAST, started_at`
        );
      } catch {
        applied = [];
      }
      const appliedNames = new Set(applied.map(r => r.migration_name));
      const finished = applied.map(r => r.finishedAt).filter(Boolean).sort();
      const here = path.dirname(fileURLToPath(import.meta.url));
      const dir = path.resolve(here, '../../prisma/migrations');
      let onDisk = [];
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        onDisk = entries.filter(e => e.isDirectory()).map(e => e.name).sort();
      } catch { onDisk = []; }
      const pending = onDisk.filter(m => !appliedNames.has(m));
      res.json({
        applied: applied.map(r => r.migration_name),
        history: applied.map(r => ({
          name: r.migration_name,
          startedAt: r.startedAt,
          finishedAt: r.finishedAt,
        })),
        lastApplied: finished.length ? finished[finished.length - 1] : null,
        appliedCount: applied.length,
        onDisk,
        pending,
        pendingCount: pending.length,
        inSync: pending.length === 0,
      });
    } catch (e) { next(e); }
  },

  // Full JSON snapshot of every managed table (sensitive fields stripped).
  // Streams as a download; capped per-table to avoid OOM on large DBs.
  async backup(req, res, next) {
    try {
      const perTable = Math.min(Math.max(Number(req.query.limit) || 5000, 1), 50000);
      const tables = {};
      for (const t of MANAGED_TABLES) {
        try {
          const rows = await delegate(t.name).findMany({ take: perTable });
          tables[t.name] = rows.map(_filterSensitive);
        } catch {
          tables[t.name] = null;
        }
      }
      const payload = {
        exportedAt: new Date().toISOString(),
        perTableLimit: perTable,
        tables,
      };
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="lgu-hrms-backup-${stamp}.json"`);
      res.json(payload);
    } catch (e) { next(e); }
  },

  // True SQL dump via the db container's pg_dump (schema + data, restorable).
  // Falls back to 503 with setup hint when docker/pg_dump is unavailable.
  async dump(req, res, next) {
    try {
      const container = process.env.DB_CONTAINER || 'lgu_hrms-db-1';
      const dbUrl = process.env.DATABASE_URL || '';
      const m = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/);
      const user = m?.[1] || 'postgres';
      const pass = m?.[2] || 'postgres';
      const db = (m?.[5] || 'lgu_hrms').split('?')[0];
      const dataOnly = req.query.dataOnly === 'true';
      const args = [
        'exec', container, 'pg_dump',
        '-U', user, '-d', db,
        '--no-owner', '--no-privileges',
        ...(dataOnly ? ['--data-only'] : []),
      ];
      execFile('docker', args, {
        env: { ...process.env, PGPASSWORD: pass },
        maxBuffer: 256 * 1024 * 1024,
        timeout: 120000,
      }, (err, stdout, stderr) => {
        if (err) {
          const hint = 'pg_dump unavailable — is Docker running and DB_CONTAINER correct?';
          return res.status(503).json({ error: { code: 'DUMP_UNAVAILABLE', message: hint, detail: String(stderr || err.message).slice(0, 500) } });
        }
        const stamp = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="lgu-hrms-dump-${stamp}.sql"`);
        res.send(stdout);
      });
    } catch (e) { next(e); }
  },

  // Read-only SELECT console. Only single SELECT/WITH statements, row-capped,
  // EXPLAIN-wrapped on request. Every run is audit-logged by the global middleware.
  async query(req, res, next) {
    try {
      const { sql, explain = false } = req.body || {};
      if (typeof sql !== 'string' || !sql.trim()) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'sql is required' } });
      }
      const cleaned = sql.trim().replace(/;+\s*$/, '');
      if (/;/.test(cleaned)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Single statement only — no semicolons' } });
      }
      if (!/^(select|with|explain)\s/i.test(cleaned)) {
        return res.status(400).json({ error: { code: 'FORBIDDEN', message: 'Read-only console: SELECT/WITH only' } });
      }
      for (const kw of ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate', 'grant', 'revoke', 'copy']) {
        if (new RegExp(`\\b${kw}\\b`, 'i').test(cleaned)) {
          return res.status(400).json({ error: { code: 'FORBIDDEN', message: `Keyword not allowed: ${kw.toUpperCase()}` } });
        }
      }
      const started = Date.now();
      if (explain) {
        const plan = await prisma.$queryRawUnsafe(`EXPLAIN (FORMAT JSON) ${cleaned}`);
        return res.json({ explain: plan, ms: Date.now() - started });
      }
      const hasLimit = /\blimit\b/i.test(cleaned);
      const rows = await prisma.$queryRawUnsafe(hasLimit ? cleaned : `${cleaned} LIMIT 200`);
      res.json({ rows: Array.isArray(rows) ? rows : [rows], count: Array.isArray(rows) ? rows.length : 1, ms: Date.now() - started, capped: !hasLimit });
    } catch (e) {
      res.status(400).json({ error: { code: 'QUERY_ERROR', message: e.message?.slice(0, 500) || 'Query failed' } });
    }
  },

  // FK dependents: which rows reference this record (pre-delete check).
  // Reads information_schema to find referencing tables, then counts + samples.
  async dependents(req, res, next) {
    try {
      const { name, id } = req.params;
      if (!isManaged(name)) return res.status(400).json({ error: `Unknown table: ${name}` });
      const refs = await prisma.$queryRawUnsafe(
        `SELECT ccu.table_name AS "table", ccu.column_name AS "column"
         FROM information_schema.table_constraints tc
         JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
         JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name
         WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = $1`,
        name
      );
      const out = [];
      for (const r of refs) {
        try {
          const rows = await prisma.$queryRawUnsafe(
            `SELECT id FROM "${r.table}" WHERE "${r.column}" = $1 LIMIT 6`, String(id)
          );
          const [{ count }] = await prisma.$queryRawUnsafe(
            `SELECT COUNT(*)::int AS count FROM "${r.table}" WHERE "${r.column}" = $1`, String(id)
          );
          out.push({ table: r.table, column: r.column, count, sampleIds: rows.map(x => x.id) });
        } catch { /* table may use composite keys — skip */ }
      }
      const total = out.reduce((s, d) => s + d.count, 0);
      res.json({ table: name, id, dependents: out, total, blocked: total > 0 });
    } catch (e) { next(e); }
  },

  // CSV import: dry-run validates, commit inserts. Unknown columns rejected.
  async importCsv(req, res, next) {
    try {
      const { name } = req.params;
      const { csv, dryRun = true } = req.body || {};
      if (!isManaged(name)) return res.status(400).json({ error: `Unknown table: ${name}` });
      if (READ_ONLY_TABLES.includes(name)) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: `${name} is read-only` } });
      }
      if (typeof csv !== 'string' || !csv.trim()) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'csv text is required' } });
      }
      const parseCsv = (text) => {
        const rows = []; let row = []; let cur = ''; let q = false;
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          if (q) {
            if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
            else cur += c;
          } else if (c === '"') q = true;
          else if (c === ',') { row.push(cur); cur = ''; }
          else if (c === '\n' || c === '\r') {
            if (cur !== '' || row.length) { row.push(cur); rows.push(row); row = []; cur = ''; }
            if (c === '\r' && text[i + 1] === '\n') i++;
          } else cur += c;
        }
        if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
        return rows;
      };
      const lines = parseCsv(csv.trim());
      if (lines.length < 2) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Need header + at least 1 data row' } });
      const [header, ...data] = lines;
      const cols = await prisma.$queryRawUnsafe(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`, name
      );
      const valid = new Set(cols.map(c => c.column_name).filter(c => c !== 'id' && c !== 'createdAt' && c !== 'updatedAt'));
      const unknown = header.filter(h => !valid.has(h));
      if (unknown.length) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Unknown columns: ${unknown.join(', ')}` } });
      }
      const rows = data.filter(r => r.some(v => v !== '')).map(r => {
        const o = {};
        header.forEach((h, i) => { if (r[i] !== '' && r[i] !== undefined) o[h] = r[i]; });
        return o;
      });
      if (dryRun) {
        return res.json({ dryRun: true, table: name, columns: header, rowCount: rows.length, preview: rows.slice(0, 5) });
      }
      const model = delegate(name);
      let inserted = 0; const errors = [];
      for (let i = 0; i < rows.length; i++) {
        try { await model.create({ data: rows[i] }); inserted++; }
        catch (e) { errors.push({ row: i + 2, message: e.message?.slice(0, 200) }); if (errors.length >= 20) break; }
      }
      res.json({ dryRun: false, table: name, inserted, failed: errors.length, errors });
    } catch (e) { next(e); }
  },

  // Retention: preview counts + run deletes for LoginEvent, old exports, soft-deleted staff.
  async retention(req, res, next) {
    try {
      const days = Math.min(Math.max(Number(req.query.days) || 90, 1), 3650);
      const cutoff = new Date(Date.now() - days * 86400000);
      const [loginEvents, sessions, audit] = await Promise.all([
        prisma.loginEvent.count({ where: { createdAt: { lt: cutoff } } }),
        prisma.userSession.count({ where: { revokedAt: { not: null }, lastActive: { lt: cutoff } } }),
        prisma.auditLog.count({ where: { timestamp: { lt: cutoff } } }).catch(() => -1),
      ]);
      const softDeleted = await prisma.employee.count({ where: { deletedAt: { not: null } } });
      res.json({
        cutoff: cutoff.toISOString(), days,
        candidates: { loginEvents, revokedSessions: sessions, auditLogs: audit, softDeletedEmployees: softDeleted },
        note: 'AuditLog purge is preview-only — the trail stays append-only. Export before any delete.',
      });
    } catch (e) { next(e); }
  },

  async retentionRun(req, res, next) {
    try {
      const { scope, days = 90, confirm = false } = req.body || {};
      if (!confirm) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Pass confirm:true to execute' } });
      if (!['loginEvents', 'revokedSessions'].includes(scope)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'scope must be loginEvents or revokedSessions' } });
      }
      const cutoff = new Date(Date.now() - Math.min(Math.max(Number(days) || 90, 1), 3650) * 86400000);
      let deleted = 0;
      if (scope === 'loginEvents') ({ count: deleted } = await prisma.loginEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }));
      else ({ count: deleted } = await prisma.userSession.deleteMany({ where: { revokedAt: { not: null }, lastActive: { lt: cutoff } } }));
      res.json({ scope, cutoff: cutoff.toISOString(), deleted });
    } catch (e) { next(e); }
  },

  // Slow queries via pg_stat_statements (or graceful fallback when absent).
  async slowQueries(req, res, next) {
    try {
      let rows;
      try {
        rows = await prisma.$queryRawUnsafe(
          `SELECT query, calls::int AS calls,
                  round(total_exec_time::numeric, 1) AS "totalMs",
                  round(mean_exec_time::numeric, 1) AS "meanMs",
                  round((100 * total_exec_time / NULLIF(sum(total_exec_time) OVER (), 0))::numeric, 1) AS "pct"
           FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 15`
        );
      } catch {
        return res.json({ available: false, hint: 'Enable pg_stat_statements: CREATE EXTENSION pg_stat_statements;' });
      }
      res.json({ available: true, queries: rows });
    } catch (e) { next(e); }
  },
};
