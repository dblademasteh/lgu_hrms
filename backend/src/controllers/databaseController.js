import { prisma } from '../lib/prisma.js';

// Tables that are safe to inspect — excludes join/relation tables that aren't
// directly managed through the UI
const MANAGED_TABLES = [
  { name: 'User', label: 'Users', description: 'System users with roles and auth' },
  { name: 'Department', label: 'Departments', description: 'Organizational units' },
  { name: 'Employee', label: 'Employees', description: 'Employee master records' },
  { name: 'Position', label: 'Positions', description: 'Job positions' },
  { name: 'PlantillaItem', label: 'Plantilla Items', description: 'Approved staffing positions' },
  { name: 'Vacancy', label: 'Vacancies', description: 'Open position vacancies' },
  { name: 'Appointment', label: 'Appointments', description: 'CSC appointment records' },
  { name: 'PayrollPeriod', label: 'Payroll Periods', description: 'Defined payroll periods' },
  { name: 'PayrollRun', label: 'Payroll Runs', description: 'Generated payroll runs' },
  { name: 'LeaveRequest', label: 'Leave Requests', description: 'Employee leave requests' },
  { name: 'Attendance', label: 'Attendance', description: 'Time and attendance records' },
  { name: 'PerformanceReview', label: 'Performance Reviews', description: 'Employee performance reviews' },
  { name: 'Bonus', label: 'Bonuses', description: 'Bonus records' },
  { name: 'Loan', label: 'Loans', description: 'Employee loan records' },
  { name: 'TrainingProgram', label: 'Training Programs', description: 'Learning programs' },
  { name: 'DesignationOrder', label: 'Designation Orders', description: 'Temporary designation orders' },
  { name: 'AuditLog', label: 'Audit Logs', description: 'Append-only audit trail' },
];

export const databaseController = {
  // List all managed tables with row counts
  async listTables(req, res) {
    const results = [];
    for (const t of MANAGED_TABLES) {
      try {
        const count = await prisma[t.name].count();
        results.push({ name: t.name, label: t.label, description: t.description, rowCount: Number(count) });
      } catch {
        results.push({ name: t.name, label: t.label, description: t.description, rowCount: -1 });
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
    // Use Prisma $queryRaw to introspect column info from information_schema
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = '${name.toLowerCase()}'
      ORDER BY ordinal_position
    `);
    res.json(columns);
  },

  // Browse records with pagination
  async browse(req, res) {
    const { name } = req.params;
    const { skip = '0', take = '20', orderBy = 'id', order = 'desc' } = req.query;
    if (!MANAGED_TABLES.some(t => t.name === name)) {
      return res.status(400).json({ error: `Unknown table: ${name}` });
    }

    const skipNum = Math.max(0, Number(skip));
    const takeNum = Math.min(100, Math.max(1, Number(take)));
    const orderStr = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [data, count] = await Promise.all([
      prisma[name].findMany({
        skip: skipNum,
        take: takeNum,
        orderBy: { [orderBy]: orderStr },
      }),
      prisma[name].count(),
    ]);

    // Filter sensitive fields before sending to client
    const SENSITIVE_FIELDS = ['passwordHash', 'twoFactorSecret', 'passwordResetToken'];
    const filtered = data.map(rec => {
      const clean = {};
      for (const [key, val] of Object.entries(rec)) {
        if (!SENSITIVE_FIELDS.includes(key)) clean[key] = val;
      }
      return clean;
    });

    res.json({ data: filtered, count, skip: skipNum, take: takeNum });
  },

  // Get a single record
  async getOne(req, res) {
    const { name, id } = req.params;
    if (!MANAGED_TABLES.some(t => t.name === name)) {
      return res.status(400).json({ error: `Unknown table: ${name}` });
    }
    const record = await prisma[name].findUnique({
      where: { id },
    select: await _selectFields(name),
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  },

  // Delete a record (soft delete where deleted_at exists)
  async remove(req, res) {
    const { name, id } = req.params;
    if (!MANAGED_TABLES.some(t => t.name === name)) {
      return res.status(400).json({ error: `Unknown table: ${name}` });
    }
    try {
      // Check if model has deletedAt field for soft delete
      const hasSoftDelete = ['Employee'].includes(name);
      if (hasSoftDelete) {
        await prisma[name].update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      } else {
        await prisma[name].delete({ where: { id } });
      }
      res.status(204).send();
    } catch (e) {
      if (e.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
      throw e;
    }
  },

  // Table counts summary
  async summary(req, res) {
    const entries = await Promise.all(
      MANAGED_TABLES.map(async (t) => {
        try {
          const count = await prisma[t.name].count();
          return { name: t.name, label: t.label, count: Number(count) };
        } catch {
          return { name: t.name, label: t.label, count: -1 };
        }
      })
    );
    const totalRecords = entries.reduce((sum, e) => sum + Math.max(0, e.count), 0);
    res.json({ tables: entries, totalTables: entries.length, totalRecords });
  },
};
