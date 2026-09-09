import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/userRepository.js';

export const accountService = {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    const completeness = calculateCompleteness(user);
    return { user, completeness };
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
  }
};

function calculateCompleteness(user) {
  let score = 0;
  if (user.username) score += 25;
  if (user.displayPrefs) score += 25;
  if (user.avatarPath) score += 25;
  if (user.passwordChangedAt) score += 25;
  return Math.min(100, score);
}
