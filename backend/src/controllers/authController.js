import { authService } from '../services/authService.js';

export const authController = {
  async login(req, res) {
    const { username, password } = req.body;
    const data = await authService.login(username, password, req);
    res.json(data);
  },
  async refresh(req, res) {
    const { refreshToken } = req.body;
    const data = await authService.refresh(refreshToken);
    res.json(data);
  },
  async loginPin(req, res) {
    const { username, pin } = req.body;
    const data = await authService.loginPin(username, pin, req);
    res.json(data);
  },
  async setupPin(req, res) {
    const data = await authService.setupPin(req.user.id, req.body.pin);
    res.json(data);
  },
  async removePin(req, res) {
    const data = await authService.removePin(req.user.id);
    res.json(data);
  }
};
