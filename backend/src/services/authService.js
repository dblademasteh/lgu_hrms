import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { userRepository } from '../repositories/userRepository.js';

const ACCESS_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

export const authService = {
  async login(username, password, req) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new Error('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');
    
    await userRepository.createLoginEvent({ userId: user.id, success: true });
    
    const deviceHash = Buffer.from(`${req.ip}-${req.get('user-agent')}`).toString('base64').slice(0,32);
    await prisma.userSession.upsert({
      where: { id: `session-${user.id}-${deviceHash}` },
      update: { lastActive: new Date() },
      create: { id: `session-${user.id}-${deviceHash}`, userId: user.id, deviceHash, ip: req.ip, userAgent: req.get('user-agent') }
    });
    
    const accessToken = jwt.sign({ id: user.id, role: user.role }, ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
    
    return { accessToken, refreshToken, user: { id: user.id, username: user.username, role: user.role } };
  },
  async refresh(refreshToken) {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const accessToken = jwt.sign({ id: payload.id, role: payload.role }, ACCESS_SECRET, { expiresIn: '15m' });
    return { accessToken };
  }
};
