import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function auditLog(req, res, next) {
  const originalSend = res.send;
  res.send = function(body) {
    if (req.method !== 'GET' && req.user) {
      prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: `${req.method} ${req.path}`,
          entity: req.baseUrl.replace('/api/v1/', ''),
          entityId: req.params.id || '',
          ip: req.ip,
        }
      }).catch(() => {});
    }
    return originalSend.call(this, body);
  };
  next();
}
