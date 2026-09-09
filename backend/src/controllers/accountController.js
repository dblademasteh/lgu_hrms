import { accountService } from '../services/accountService.js';
import { twoFactorService } from '../services/twoFactorService.js';

export const accountController = {
  async getProfile(req, res) {
    const data = await accountService.getProfile(req.user.id);
    res.json(data);
  },
  async setup2FA(req, res) {
    const data = await twoFactorService.setup(req.user.id);
    res.json(data);
  },
  async verify2FA(req, res) {
    const { code } = req.body;
    const valid = await twoFactorService.verify(req.user.id, code);
    res.json({ valid });
  },
  async updateProfile(req, res) {
    const data = await accountService.updateProfile(req.user.id, req.body);
    res.json(data);
  },
  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    await accountService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ message: 'Password changed' });
  },
  async getSessions(req, res) {
    const sessions = await accountService.getSessions(req.user.id);
    res.json(sessions);
  },
  async revokeSession(req, res) {
    await accountService.revokeSession(req.params.id);
    res.json({ message: 'Session revoked' });
  }
};
