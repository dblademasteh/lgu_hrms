import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function signPayload(secret, payload) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

export async function dispatchWebhooks(tenantId, event, payload) {
  const webhooks = await prisma.webhookSubscription.findMany({
    where: { tenantId, isActive: true, events: { has: event } },
  });

  const results = [];
  for (const webhook of webhooks) {
    try {
      const signature = signPayload(webhook.secret, payload);
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-HRMS-Signature': signature,
          'X-HRMS-Event': event,
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text().catch(() => '');
      results.push({
        webhookId: webhook.id,
        status: response.status,
        body: text.slice(0, 500),
      });

      if (!response.ok) {
        console.warn(`[webhook] delivery failed for ${webhook.name}:`, response.status, text.slice(0, 200));
      }
    } catch (err) {
      console.warn(`[webhook] delivery error for ${webhook.name}:`, err.message);
      results.push({ webhookId: webhook.id, error: err.message });
    }
  }

  return results;
}
