import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';

export async function login(username, password) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
  
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');

  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken, user: { id: user.id, username: user.username, role: user.role } };
}

export async function refresh(refreshToken) {
  const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');

  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  return { accessToken };
}
