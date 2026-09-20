import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export async function listExternalSystems(req, res, next) {
  try {
    const systems = await prisma.externalSystem.findMany({
      where: withTenant(req, {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        type: true,
        description: true,
        baseUrl: true,
        apiKey: true,
        apiSecret: true,
        headers: true,
        syncDirection: true,
        attendanceMode: true,
        attendancePollInterval: true,
        deviceId: true,
        punchKey: true,
        isActive: true,
        lastSyncedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(systems);
  } catch (e) {
    next(e);
  }
}

export async function createExternalSystem(req, res, next) {
  try {
    const { name, type, description, baseUrl, apiKey, apiSecret, headers, syncDirection, attendanceMode, attendancePollInterval, deviceId, punchKey } = req.body || {};

    if (!name || !type || !baseUrl) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name, type, and baseUrl are required.' } });
    }

    const system = await prisma.externalSystem.create({
      data: stampTenant(req, {
        name,
        type,
        description: description || null,
        baseUrl,
        apiKey: apiKey || null,
        apiSecret: apiSecret || null,
        headers: headers || null,
        syncDirection: syncDirection || 'pull',
        attendanceMode: type === 'ATTENDANCE' ? (attendanceMode || null) : null,
        attendancePollInterval: type === 'ATTENDANCE' && attendancePollInterval ? Math.max(0, Number(attendancePollInterval)) : null,
        deviceId: type === 'ATTENDANCE' ? (deviceId || null) : null,
        punchKey: type === 'ATTENDANCE' ? (punchKey || null) : null,
      }),
    });

    res.status(201).json({ data: system });
  } catch (e) {
    next(e);
  }
}

export async function updateExternalSystem(req, res, next) {
  try {
    const { id } = req.params;
    const { name, type, description, baseUrl, apiKey, apiSecret, headers, syncDirection, isActive, attendanceMode, attendancePollInterval, deviceId, punchKey } = req.body || {};

    const existing = await prisma.externalSystem.findFirst({ where: withTenant(req, { id }) });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'External system not found' } });

    const updated = await prisma.externalSystem.update({
      where: withTenant(req, { id }),
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(baseUrl !== undefined ? { baseUrl } : {}),
        ...(apiKey !== undefined ? { apiKey } : {}),
        ...(apiSecret !== undefined ? { apiSecret } : {}),
        ...(headers !== undefined ? { headers } : {}),
        ...(syncDirection !== undefined ? { syncDirection } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(type === 'ATTENDANCE' ? {
          attendanceMode: attendanceMode !== undefined ? (attendanceMode || null) : existing.attendanceMode,
          attendancePollInterval: attendancePollInterval !== undefined ? (attendancePollInterval ? Math.max(0, Number(attendancePollInterval)) : null) : existing.attendancePollInterval,
          deviceId: deviceId !== undefined ? (deviceId || null) : existing.deviceId,
          punchKey: punchKey !== undefined ? (punchKey || null) : existing.punchKey,
        } : {
          attendanceMode: null,
          attendancePollInterval: null,
          deviceId: null,
          punchKey: null,
        }),
      },
    });

    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
}

export async function deleteExternalSystem(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.externalSystem.findFirst({ where: withTenant(req, { id }) });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'External system not found' } });

    await prisma.externalSystem.delete({ where: withTenant(req, { id }) });
    res.json({ message: 'External system deleted' });
  } catch (e) {
    next(e);
  }
}
