import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const apiKeyController = {
  // List API keys for the current user's tenant (excludes keyHash for security)
  listApiKeys: async (req, res) => {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: { message: 'tenantId missing' } });
      const keys = await prisma.apiKey.findMany({
        where: { tenantId },
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
      console.error('listApiKeys error', e);
      res.status(500).json({ error: { message: e.message } });
    }
  },

  // Create a new API key
  createApiKey: async (req, res) => {
    try {
      const { name, scopes } = req.body;
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: { message: 'tenantId missing' } });
      if (!name) return res.status(400).json({ error: { message: 'name required' } });
      
      const rawKey = crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      
      const key = await prisma.apiKey.create({
        data: { 
          tenantId, 
          name, 
          keyHash, 
          scopes: scopes || ['employees:read'] 
        },
        select: {
          id: true,
          name: true,
          scopes: true,
          isActive: true,
          createdAt: true,
        },
      });
      
      // Return the raw key - user MUST save this now, it won't be shown again
      res.json({ 
        id: key.id, 
        name: key.name, 
        key: rawKey,  // Only returned once
        scopes: key.scopes,
        isActive: key.isActive,
        createdAt: key.createdAt,
      });
    } catch (e) {
      console.error('createApiKey error', e);
      res.status(500).json({ error: { message: e.message } });
    }
  },

  // Deactivate/reactivate or permanently delete an API key
  revokeApiKey: async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: { message: 'tenantId missing' } });
      
      const key = await prisma.apiKey.findFirst({ where: { id, tenantId } });
      if (!key) return res.status(404).json({ error: { message: 'API key not found' } });
      
      const hardDelete = String(req.query.hard || '').toLowerCase() === 'true';
      
      if (hardDelete) {
        await prisma.apiKey.delete({ where: { id } });
        res.json({ message: 'API key permanently deleted' });
      } else {
        const updated = await prisma.apiKey.update({
          where: { id },
          data: { isActive: !key.isActive },
        });
        res.json({ message: updated.isActive ? 'API key reactivated' : 'API key deactivated', isActive: updated.isActive });
      }
    } catch (e) {
      console.error('revokeApiKey error', e);
      res.status(500).json({ error: { message: e.message } });
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
