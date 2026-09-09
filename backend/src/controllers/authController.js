import { login, refresh } from '../services/authService.js';

export async function loginHandler(req, res) {
  const { username, password } = req.body;
  const result = await login(username, password);
  res.json(result);
}

export async function refreshHandler(req, res) {
  const { refreshToken } = req.body;
  const result = await refresh(refreshToken);
  res.json(result);
}
