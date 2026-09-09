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
  }
};
