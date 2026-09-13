import crypto from 'crypto';
import { authService } from '../services/authService.js';
import { oidcEnabled, getAuthorizationUrl, exchangeCodeForProfile, upsertUserFromOidc } from '../services/oidcService.js';

const OIDC_STATE_TTL_MS = 10 * 60 * 1000;
const OIDC_TICKET_TTL_MS = 2 * 60 * 1000;
const oidcStates = new Map(); // state -> { createdAt, tenantId }
const oidcTickets = new Map(); // ticket -> { createdAt, session }

function pruneOidcStates() {
  const now = Date.now();
  for (const [k, v] of oidcStates) {
    if (now - v.createdAt > OIDC_STATE_TTL_MS) oidcStates.delete(k);
  }
  for (const [k, v] of oidcTickets) {
    if (now - v.createdAt > OIDC_TICKET_TTL_MS) oidcTickets.delete(k);
  }
}

function frontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

export const authController = {
  async login(req, res) {
    const { username, password } = req.body;
    const data = await authService.login(username, password, req);
    res.json(data);
  },
  async refresh(req, res) {
    const { refreshToken } = req.body;
    const data = await authService.refresh(refreshToken);
    res.json(data);
  },
  async loginPin(req, res) {
    const { username, pin } = req.body;
    const data = await authService.loginPin(username, pin, req);
    res.json(data);
  },
  async setupPin(req, res) {
    const data = await authService.setupPin(req.user.id, req.body.pin);
    res.json(data);
  },
  async removePin(req, res) {
    const data = await authService.removePin(req.user.id);
    res.json(data);
  },
  // ── SSO (OIDC) ──────────────────────────────────────────────────────────
  async oidcStatus(req, res) {
    res.json({ enabled: oidcEnabled() });
  },
  async oidcLogin(req, res) {
    if (!oidcEnabled()) return res.status(400).json({ error: { code: 'OIDC_DISABLED', message: 'SSO is not configured' } });
    pruneOidcStates();
    const state = crypto.randomUUID();
    // Tenant pre-selection flows through state (login page Advanced toggle).
    const tenantId = typeof req.query.tenantId === 'string' && req.query.tenantId ? req.query.tenantId : null;
    oidcStates.set(state, { createdAt: Date.now(), tenantId });
    const url = await getAuthorizationUrl(state);
    res.json({ url });
  },
  async oidcCallback(req, res) {
    // Browser leg: the IdP redirected here. Complete the exchange, stash
    // the session behind a single-use ticket, and bounce to the frontend.
    // (Tokens never travel in URLs.)
    try {
      const { code, state, error: idpError } = req.query;
      if (idpError) return res.redirect(`${frontendUrl()}/auth/callback?error=${encodeURIComponent(String(idpError))}`);
      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        return res.redirect(`${frontendUrl()}/auth/callback?error=bad_response`);
      }
      pruneOidcStates();
      const saved = oidcStates.get(state);
      if (!saved) return res.redirect(`${frontendUrl()}/auth/callback?error=bad_state`);
      oidcStates.delete(state);
      const profile = await exchangeCodeForProfile(code, state);
      const user = await upsertUserFromOidc({ tenantId: saved.tenantId, profile });
      const data = await authService.issueSessionForUser(user, req);
      const ticket = crypto.randomBytes(32).toString('hex');
      oidcTickets.set(ticket, { createdAt: Date.now(), session: data });
      return res.redirect(`${frontendUrl()}/auth/callback?ticket=${ticket}`);
    } catch (e) {
      console.error('[oidc] callback failed:', e?.message || e);
      const detail = process.env.NODE_ENV === 'production' ? null : String(e?.message || e).slice(0, 160);
      const code = encodeURIComponent(e.code || 'sso_failed');
      const suffix = detail ? `&detail=${encodeURIComponent(detail)}` : '';
      return res.redirect(`${frontendUrl()}/auth/callback?error=${code}${suffix}`);
    }
  },
  async oidcConsume(req, res) {
    // XHR leg: frontend trades the one-time ticket for the session.
    const { ticket } = req.body || {};
    if (!ticket || typeof ticket !== 'string') {
      return res.status(400).json({ error: { code: 'OIDC_BAD_TICKET', message: 'Missing ticket' } });
    }
    pruneOidcStates();
    const saved = oidcTickets.get(ticket);
    if (!saved) return res.status(400).json({ error: { code: 'OIDC_BAD_TICKET', message: 'Invalid or expired ticket' } });
    oidcTickets.delete(ticket);
    res.json(saved.session);
  }
};
