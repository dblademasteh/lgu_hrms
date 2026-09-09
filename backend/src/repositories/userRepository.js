import { prisma } from '../lib/prisma.js';

export async function findUserByUsername(username) {
  return prisma.user.findUnique({ where: { username } });
}

export async function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}
