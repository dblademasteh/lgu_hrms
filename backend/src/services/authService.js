import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { userRepository } from '../repositories/userRepository.js';

const ACCESS_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

// Password policy: passwords expire 30 days after last change.
const PASSWORD_MAX_AGE_DAYS = 30;
// PIN brute-force guard: short numeric PINs lock out after repeated failures.
const PIN_FAIL_LIMIT = 8;
const PIN_FAIL_WINDOW_MIN = 15;

function passwordAge(user) {
  if (!user.passwordChangedAt) return { ageDays: null, expired: true };
  const ageDays = Math.floor((Date.now() - new Date(user.passwordChangedAt).getTime()) / 86400000);
  return { ageDays, expired: ageDays > PASSWORD_MAX_AGE_DAYS };
}

async function recentFailures(userId) {
  const since = new Date(Date.now() - PIN_FAIL_WINDOW_MIN * 60000);
  return prisma.loginEvent.count({ where: { userId, success: false, createdAt: { gte: since } } });
}

async function issueSession(user, req) {
  const deviceHash = Buffer.from(`${req.ip}-${req.get('user-agent')}`).toString('base64').slice(0, 32);
  await prisma.userSession.upsert({
    where: { id: `session-${user.id}-${deviceHash}` },
    update: { lastActive: new Date() },
    create: { id: `session-${user.id}-${deviceHash}`, userId: user.id, deviceHash, ip: req.ip, userAgent: req.get('user-agent') }
  });
  const accessToken = jwt.sign({ id: user.id, role: user.role, tenantId: user.tenantId ?? null }, ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
  const { ageDays, expired } = passwordAge(user);
  return {
    accessToken, refreshToken,
    user: { id: user.id, username: user.username, role: user.role, tenantId: user.tenantId ?? null },
    passwordAgeDays: ageDays,
    passwordExpired: expired,
  };
}

export const authService = {
  async login(username, password, req) {
    const fail = (msg = 'Invalid credentials') => {
      const err = new Error(msg);
      err.status = 401;
      throw err;
    };
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) fail();
    const valid = await bcrypt.compare(password, user.passwordHash);
    await userRepository.createLoginEvent({ userId: user.id, success: valid });
    if (!valid) fail();
    if (user.status === 'INACTIVE') fail('Account is deactivated');

    return issueSession(user, req);
  },
  // PIN sign-in: short numeric credential for quick workstation access.
  // Brute-force guarded by failure counting; shares the session/token shape.
  async loginPin(username, pin, req) {
    const fail = (msg = 'Invalid credentials') => {
      const err = new Error(msg);
      err.status = 401;
      throw err;
    };
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.status === 'INACTIVE') {
      // No user row to attach a failure event to — generic error avoids enumeration.
      fail();
    }
    if (!user.pinHash) fail('PIN sign-in is not enabled for this account');
    if ((await recentFailures(user.id)) >= PIN_FAIL_LIMIT) {
      await userRepository.createLoginEvent({ userId: user.id, success: false });
      const err = new Error('Too many failed attempts — try again later');
      err.status = 429;
      throw err;
    }
    const valid = await bcrypt.compare(pin, user.pinHash);
    await userRepository.createLoginEvent({ userId: user.id, success: valid });
    if (!valid) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }
    return issueSession(user, req);
  },
  // Set or replace the caller's PIN (requires an authenticated session).
  async setupPin(userId, pin) {
    const hash = await bcrypt.hash(pin, 12);
    await prisma.user.update({ where: { id: userId }, data: { pinHash: hash } });
    return { message: 'PIN saved' };
  },
  async removePin(userId) {
    await prisma.user.update({ where: { id: userId }, data: { pinHash: null } });
    return { message: 'PIN removed' };
  },
  async refresh(refreshToken) {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    // Re-read the user so the new access token carries the live role
    // (refresh tokens only carry the id). Revoked/missing users fail closed.
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.status === 'INACTIVE') throw new Error('Invalid refresh token');
    const accessToken = jwt.sign({ id: user.id, role: user.role, tenantId: user.tenantId ?? null }, ACCESS_SECRET, { expiresIn: '15m' });
    return { accessToken };
  }
};
