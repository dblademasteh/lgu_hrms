import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { authService } from '../services/authService.js';
import { ingestLogs } from '../services/deviceSyncService.js';
import { injectDeviceEventsSchema } from '../shared/contracts/biometricDevices.js';

const router = Router();

const switchRoleSchema = z.object({
  role: z.string().min(1),
  tenantId: z.string().min(1).optional(),
});

router.post('/switch-role', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Role switching is disabled in production' } });
  }
  try {
    const parsed = switchRoleSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'role is required' } });
    }
    const { role, tenantId } = parsed.data;
    if (!req.user?.id) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'role and authenticated user are required' } });
    }
    const data = await authService.switchRole(req.user.id, role, req, tenantId);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// Fake terminal for testing the pull pipeline end-to-end without hardware.
// Feeds synthetic punch events through the SAME ingestLogs path the real ZK
// sync uses, so dedup + row-state semantics are exercised for real, not mocked.
router.post('/device-events', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Event injection is disabled in production' } });
  }
  try {
    const parsed = injectDeviceEventsSchema.body.parse(req.body);
    const { employeeNumber, events } = parsed;

    const employee = await prisma.employee.findFirst({
      where: withTenant(req, { employeeNumber }),
      select: { id: true, employeeNumber: true },
    });
    if (!employee) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Employee ${employeeNumber} not found in tenant` } });
    }

    const now = Date.now();
    let device = await prisma.biometricDevice.findFirst({
      where: withTenant(req, { name: 'Dev Simulator' }),
    });
    if (!device) {
      device = await prisma.biometricDevice.create({
        data: stampTenant(req, {
          name: 'Dev Simulator',
          model: 'simulator',
          protocol: 'ZK_TCP',
          host: 'sim',
          port: 0,
          serial: 'dev-simulator',
          active: true,
          pollIntervalMs: 30000,
        }),
      });
    }

    const logs = events.map((at, i) => ({
      deviceLogId: `sim-${now}-${i}`,
      userId: employeeNumber.trim(),
      punchedAt: new Date(at),
      verification: 'Fingerprint',
    }));

    const result = await ingestLogs(req, device.id, logs);
    res.json({ ...result, employee: { id: employee.id, employeeNumber: employee.employeeNumber } });
  } catch (e) {
    next(e);
  }
});

export default router;