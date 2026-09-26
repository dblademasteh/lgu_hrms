import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

export async function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key) return res.status(401).json({ error: { message: 'API key missing' } });
  
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
  if (!apiKey || !apiKey.isActive) {
    return res.status(401).json({ error: { message: 'Invalid API key' } });
  }
  
  req.tenantContext = { tenantId: apiKey.tenantId };
  req.apiKeyScopes = apiKey.scopes;
  req.tenantId = apiKey.tenantId;
  next();
}

export function requireScope(...requiredScopes) {
  return (req, res, next) => {
    const scopes = Array.isArray(req.apiKeyScopes) ? req.apiKeyScopes : [];
    const missing = requiredScopes.filter(s => !scopes.includes(s));
    if (missing.length > 0) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: `Missing scopes: ${missing.join(', ')}` }});
    }
    next();
  };
}

export function requireAnyScope(...requiredScopes) {
  return (req, res, next) => {
    const scopes = Array.isArray(req.apiKeyScopes) ? req.apiKeyScopes : [];
    const hasAny = requiredScopes.some(s => scopes.includes(s));
    if (!hasAny) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: `Missing one of scopes: ${requiredScopes.join(', ')}` }});
    }
    next();
  };
}
