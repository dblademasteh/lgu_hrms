import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

function signPayload(secret, payload) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

export async function listWebhooks(req, res, next) {
  try {
    const webhooks = await prisma.webhookSubscription.findMany({
      where: withTenant(req, {}),
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
    next(e);
  }
}

export async function createWebhook(req, res, next) {
  try {
    const { name, url, events, secret } = req.body || {};
    if (!name || !url || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name, url, and events[] are required.' } });
    }

    const webhookSecret = secret || crypto.randomBytes(24).toString('hex');

    const webhook = await prisma.webhookSubscription.create({
      data: stampTenant(req, {
        name,
        url,
        events,
        secret: webhookSecret,
      }),
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
    next(e);
  }
}

export async function rotateWebhookSecret(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.webhookSubscription.findFirst({ where: withTenant(req, { id }) });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } });

    const newSecret = crypto.randomBytes(24).toString('hex');

    const updated = await prisma.webhookSubscription.update({
      where: withTenant(req, { id }),
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
    next(e);
  }
}

export async function updateWebhook(req, res, next) {
  try {
    const { id } = req.params;
    const { name, url, events, secret, isActive } = req.body || {};

    const existing = await prisma.webhookSubscription.findFirst({ where: withTenant(req, { id }) });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } });

    const updated = await prisma.webhookSubscription.update({
      where: withTenant(req, { id }),
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
    next(e);
  }
}

export async function deleteWebhook(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.webhookSubscription.findFirst({ where: withTenant(req, { id }) });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } });

    await prisma.webhookSubscription.delete({ where: withTenant(req, { id }) });
    res.json({ message: 'Webhook deleted' });
  } catch (e) {
    next(e);
  }
}

export async function testWebhook(req, res, next) {
  try {
    const { id } = req.params;

    const webhook = await prisma.webhookSubscription.findFirst({ where: withTenant(req, { id }) });
    if (!webhook) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } });

    const payload = {
      event: 'employee.updated',
      tenantId: req.tenantId,
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
    next(e);
  }
}
