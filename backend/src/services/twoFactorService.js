export const twoFactorService = {
  async setup(userId) {
    // Stub: generate a secret placeholder
    const secret = `TEMP-${userId.slice(0,8)}`;
    await this._updateSecret(userId, secret);
    return { secret, otpauthUrl: `otpauth://totp/LGU-${userId}?secret=${secret}` };
  },
  async verify(userId, code) {
    // Stub verification: accept '123456'
    const user = await this._findUser(userId);
    if (!user?.twoFactorSecret) throw new Error('2FA not set up');
    const valid = code === '123456';
    if (valid) {
      await this._updateUser(userId, { twoFactorEnabled: true });
    }
    return valid;
  },
  async _findUser(id) {
    const { prisma } = await import('../lib/prisma.js');
    return prisma.user.findUnique({ where: { id } });
  },
  async _updateSecret(id, secret) {
    const { prisma } = await import('../lib/prisma.js');
    return prisma.user.update({ where: { id }, data: { twoFactorSecret: secret } });
  },
  async _updateUser(id, data) {
    const { prisma } = await import('../lib/prisma.js');
    return prisma.user.update({ where: { id }, data });
  }
};
