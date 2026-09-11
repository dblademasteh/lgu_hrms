import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/userRepository.js';

export const accountService = {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    const completeness = calculateCompleteness(user);
    // Never expose credential hashes to the client.
    const { passwordHash, pinHash, twoFactorSecret, ...safe } = user;
    return { user: { ...safe, pinEnabled: !!pinHash }, completeness };
  },
  async updateProfile(userId, data) {
    return userRepository.update(userId, data);
  },
  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new Error('Invalid current password');
    const hash = await bcrypt.hash(newPassword, 12);
    return userRepository.update(userId, { passwordHash: hash, passwordChangedAt: new Date() });
  },
  async getSessions(userId) {
    return userRepository.getSessions(userId);
  },
  async revokeSession(sessionId) {
    return userRepository.revokeSession(sessionId);
  },
  async getLoginEvents(userId) {
    return userRepository.getLoginEvents(userId);
  },
  async getDelegations(userId) {
    return userRepository.getDelegations(userId);
  },
  async createDelegation(delegatorId, data) {
    const { delegateeId, scope, reason, startsAt, endsAt } = data;
    return userRepository.createDelegation({ delegatorId, delegateeId, scope, reason, startsAt: new Date(startsAt), endsAt: new Date(endsAt) });
  },
  async deleteDelegation(delegationId, userId) {
    return userRepository.deleteDelegation(delegationId, userId);
  },
  async deactivateAccount(userId) {
    return userRepository.update(userId, { externalId: 'DEACTIVATED' });
  }
};

function calculateCompleteness(user) {
  let score = 0;
  if (user.username) score += 20;
  if (user.displayName) score += 20;
  if (user.email) score += 20;
  if (user.contactNumber) score += 20;
  if (user.avatarPath) score += 20;
  return Math.min(100, score);
}
