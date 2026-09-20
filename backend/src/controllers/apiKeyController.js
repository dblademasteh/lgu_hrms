import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { withTenant, stampTenant } from '../middleware/tenant.js';

export const apiKeyController = {
  listApiKeys: async (req, res, next) => {
    try {
      const keys = await prisma.apiKey.findMany({
        where: withTenant(req, {}),
        select: {
          id: true,
          name: true,
          scopes: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json(keys);
    } catch (e) {
      next(e);
    }
  },

  createApiKey: async (req, res, next) => {
    try {
      const { name, scopes } = req.body;
      if (!name) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name required' } });
      }

      const rawKey = crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

      const key = await prisma.apiKey.create({
        data: stampTenant(req, {
          name,
          keyHash,
          scopes: Array.isArray(scopes) && scopes.length > 0 ? scopes : ['employees:read'],
        }),
        select: {
          id: true,
          name: true,
          scopes: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.json({
        id: key.id,
        name: key.name,
        key: rawKey,
        scopes: key.scopes,
        isActive: key.isActive,
        createdAt: key.createdAt,
      });
    } catch (e) {
      next(e);
    }
  },

  revokeApiKey: async (req, res, next) => {
    try {
      const { id } = req.params;
      const key = await prisma.apiKey.findFirst({
        where: withTenant(req, { id }),
      });
      if (!key) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API key not found' } });
      }

      const hardDelete = String(req.query.hard || '').toLowerCase() === 'true';

      if (hardDelete) {
        await prisma.apiKey.delete({ where: withTenant(req, { id }) });
        res.json({ message: 'API key permanently deleted' });
      } else {
        const updated = await prisma.apiKey.update({
          where: withTenant(req, { id }),
          data: { isActive: !key.isActive },
        });
        res.json({ message: updated.isActive ? 'API key reactivated' : 'API key deactivated', isActive: updated.isActive });
      }
    } catch (e) {
      next(e);
    }
  },
};

export const createApiKey = async (req, res) => {
  await apiKeyController.createApiKey(req, res);
};

export async function listApiKeys(req, res) {
  await apiKeyController.listApiKeys(req, res);
}

export async function revokeApiKey(req, res) {
  await apiKeyController.revokeApiKey(req, res);
}
