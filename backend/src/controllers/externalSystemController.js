import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function listExternalSystems(req, res) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const systems = await prisma.externalSystem.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: systems });
  } catch (e) {
    console.error('listExternalSystems error', e);
    res.status(500).json({ error: { message: e.message } });
  }
}

export async function createExternalSystem(req, res) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { name, type, description, baseUrl, apiKey, apiSecret, headers, syncDirection } = req.body || {};

    if (!name || !type || !baseUrl) {
      return res.status(400).json({ error: { message: 'name, type, and baseUrl are required.' } });
    }

    const system = await prisma.externalSystem.create({
      data: {
        tenantId,
        name,
        type,
        description: description || null,
        baseUrl,
        apiKey: apiKey || null,
        apiSecret: apiSecret || null,
        headers: headers || null,
        syncDirection: syncDirection || 'pull',
      },
    });

    res.status(201).json({ data: system });
  } catch (e) {
    console.error('createExternalSystem error', e);
    res.status(500).json({ error: { message: e.message } });
  }
}

export async function updateExternalSystem(req, res) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { name, type, description, baseUrl, apiKey, apiSecret, headers, syncDirection, isActive } = req.body || {};

    const existing = await prisma.externalSystem.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: { message: 'External system not found' } });

    const updated = await prisma.externalSystem.update({
      where: { id },
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
      },
    });

    res.json({ data: updated });
  } catch (e) {
    console.error('updateExternalSystem error', e);
    res.status(500).json({ error: { message: e.message } });
  }
}

export async function deleteExternalSystem(req, res) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const existing = await prisma.externalSystem.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: { message: 'External system not found' } });

    await prisma.externalSystem.delete({ where: { id } });
    res.json({ message: 'External system deleted' });
  } catch (e) {
    console.error('deleteExternalSystem error', e);
    res.status(500).json({ error: { message: e.message } });
  }
}
