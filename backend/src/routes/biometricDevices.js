import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { syncDeviceById } from '../services/deviceSyncService.js';
import {
  createBiometricDeviceSchema,
  updateBiometricDeviceSchema,
  getBiometricDeviceSchema,
  syncBiometricDeviceSchema,
  deleteBiometricDeviceSchema,
} from '../shared/contracts/biometricDevices.js';

const router = Router();

router.use(requireRole('ADMIN'));

router.get('/', async (req, res, next) => {
  try {
    const devices = await prisma.biometricDevice.findMany({
      where: withTenant(req, {}),
      orderBy: { createdAt: 'desc' },
    });
    res.json(devices);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', validate(getBiometricDeviceSchema), async (req, res, next) => {
  try {
    const device = await prisma.biometricDevice.findFirst({
      where: withTenant(req, { id: req.params.id }),
    });
    if (!device) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Device not found' } });
    }
    res.json(device);
  } catch (e) {
    next(e);
  }
});

router.post('/', validate(createBiometricDeviceSchema), async (req, res, next) => {
  try {
    const device = await prisma.biometricDevice.create({
      data: stampTenant(req, {
        name: req.body.name,
        model: req.body.model ?? null,
        protocol: req.body.protocol ?? 'ZK_TCP',
        host: req.body.host.trim(),
        port: req.body.port ?? 4370,
        serial: req.body.serial ?? null,
        active: req.body.active ?? true,
        pollIntervalMs: req.body.pollIntervalMs ?? 30000,
      }),
    });
    res.status(201).json(device);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', validate(updateBiometricDeviceSchema), async (req, res, next) => {
  try {
    const scoped = await prisma.biometricDevice.findFirst({ where: withTenant(req, { id: req.params.id }) });
    if (!scoped) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Device not found' } });
    }
    const { name, model, protocol, host, port, serial, active, pollIntervalMs } = req.body;
    const device = await prisma.biometricDevice.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(model !== undefined && { model: model ?? null }),
        ...(protocol !== undefined && { protocol }),
        ...(host !== undefined && { host: host.trim() }),
        ...(port !== undefined && { port }),
        ...(serial !== undefined && { serial: serial ?? null }),
        ...(active !== undefined && { active }),
        ...(pollIntervalMs !== undefined && { pollIntervalMs }),
      },
    });
    res.json(device);
  } catch (e) {
    next(e);
  }
});

// Manual pull-and-ingest. Idempotent; repeated syncs only skip existing logs.
router.post('/:id/sync', validate(syncBiometricDeviceSchema), async (req, res, next) => {
  try {
    const device = await prisma.biometricDevice.findFirst({ where: withTenant(req, { id: req.params.id }) });
    if (!device) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Device not found' } });
    }
    const result = await syncDeviceById(device.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', validate(deleteBiometricDeviceSchema), async (req, res, next) => {
  try {
    const scoped = await prisma.biometricDevice.findFirst({ where: withTenant(req, { id: req.params.id }) });
    if (!scoped) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Device not found' } });
    }
    await prisma.biometricDevice.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;