import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { withTenant } from '../middleware/tenant.js';
import { payrollAdapter } from '../services/payrollAdapter.js';

function signPayload(secret, payload) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

export async function lguPayrollWebhook(req, res, next) {
  try {
    const signature = req.headers['x-webhook-signature'] || req.headers['x-hrms-signature'];
    if (!signature) {
      return res.status(400).json({ error: { code: 'MISSING_SIGNATURE', message: 'Missing webhook signature' } });
    }

    const payload = req.body;
    const { event } = payload;
    const tenantId = payload.tenantId ?? req.tenantId ?? null;

    // Find lgu-payroll integration config for this tenant
    const externalSystem = await prisma.externalSystem.findFirst({
      where: { tenantId, type: 'PAYROLL', isActive: true },
      select: { apiKey: true, apiSecret: true, name: true },
    });

    if (!externalSystem) {
      // Name the tenant we looked up: the usual cause is payroll sending a
      // tenant *code* (e.g. "SOLANA") where the tenant *id* ("tenant-solana")
      // is required, or an integration provisioned under a different tenant.
      return res.status(400).json({
        error: {
          code: 'NOT_CONFIGURED',
          message: tenantId
            ? `No active PAYROLL integration is configured for tenant "${tenantId}". Check that lgu-payroll's HRMS tenant ID matches a tenant that has a payroll integration.`
            : 'Payroll integration not configured: the webhook payload carried no tenantId.',
        },
      });
    }

    // The HMAC secret is the integration's shared secret (apiSecret), not the
    // apiKey: payroll signs with hrmsWebhookSecret, and apiKey is a distinct
    // credential (the pull direction authenticates via the ApiKey table).
    // Fall back to apiKey for integrations configured before apiSecret existed.
    const signingSecret = externalSystem.apiSecret || externalSystem.apiKey;
    if (!signingSecret) {
      return res.status(400).json({ error: { code: 'NOT_CONFIGURED', message: 'Payroll integration has no signing secret' } });
    }

    // Verify signature using the shared secret
    const expectedSignature = signPayload(signingSecret, payload);
    if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' } });
    }

    // Trigger payroll sync for payroll-related events
    if (event && (event.startsWith('payroll.') || event === 'sync.requested')) {
      try {
        req.tenantId = tenantId;
        const result = await payrollAdapter.sync(req, null);
        return res.json({ ok: true, message: 'Payroll sync triggered', sync: result });
      } catch (syncErr) {
        console.error('[lguPayrollWebhook] sync failed:', syncErr);
        return res.status(502).json({ error: { code: 'SYNC_FAILED', message: syncErr.message } });
      }
    }

    return res.json({ ok: true, message: 'Webhook received', event });
  } catch (e) {
    next(e);
  }
}
