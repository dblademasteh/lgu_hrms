import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function signPayload(secret, payload) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

export async function listWebhooks(req, res) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const webhooks = await prisma.webhookSubscription.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(webhooks);
  } catch (e) {
    console.error('listWebhooks error', e);
    res.status(500).json({ error: { message: e.message } });
  }
}

export async function createWebhook(req, res) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { name, url, events, secret } = req.body || {};
    if (!name || !url || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: { message: 'name, url, and events[] are required.' } });
    }

    const webhookSecret = secret || crypto.randomBytes(24).toString('hex');

    const webhook = await prisma.webhookSubscription.create({
      data: {
        tenantId,
        name,
        url,
        events,
        secret: webhookSecret,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({ data: webhook, secret: webhookSecret });
  } catch (e) {
    console.error('createWebhook error', e);
    res.status(500).json({ error: { message: e.message } });
  }
}

export async function rotateWebhookSecret(req, res) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const existing = await prisma.webhookSubscription.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: { message: 'Webhook not found' } });

    const newSecret = crypto.randomBytes(24).toString('hex');

    const updated = await prisma.webhookSubscription.update({
      where: { id },
      data: { secret: newSecret },
      select: {
        id: true,
        tenantId: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ data: updated, secret: newSecret });
  } catch (e) {
    console.error('rotateWebhookSecret error', e);
    res.status(500).json({ error: { message: e.message } });
  }
}

export async function updateWebhook(req, res) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { name, url, events, secret, isActive } = req.body || {};

    const existing = await prisma.webhookSubscription.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: { message: 'Webhook not found' } });

    const updated = await prisma.webhookSubscription.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(url !== undefined ? { url } : {}),
        ...(events !== undefined ? { events } : {}),
        ...(secret !== undefined ? { secret } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ data: updated });
  } catch (e) {
    console.error('updateWebhook error', e);
    res.status(500).json({ error: { message: e.message } });
  }
}

export async function deleteWebhook(req, res) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const existing = await prisma.webhookSubscription.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: { message: 'Webhook not found' } });

    await prisma.webhookSubscription.delete({ where: { id } });
    res.json({ message: 'Webhook deleted' });
  } catch (e) {
    console.error('deleteWebhook error', e);
    res.status(500).json({ error: { message: e.message } });
  }
}

export async function testWebhook(req, res) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const webhook = await prisma.webhookSubscription.findFirst({ where: { id, tenantId } });
    if (!webhook) return res.status(404).json({ error: { message: 'Webhook not found' } });

    const payload = {
      event: 'employee.updated',
      tenantId,
      employeeId: 'test',
      changedFields: ['test'],
      timestamp: new Date().toISOString(),
      actorUserId: req.user?.id,
    };

    const signature = signPayload(webhook.secret, payload);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HRMS-Signature': signature,
        'X-HRMS-Event': 'employee.updated',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    res.json({ status: response.status, body: text.slice(0, 500) });
  } catch (e) {
    console.error('testWebhook error', e);
    res.status(500).json({ error: { message: e.message } });
  }
}
