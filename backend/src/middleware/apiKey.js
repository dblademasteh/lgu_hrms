import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
  next();
}
