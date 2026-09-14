import { Router } from 'express';
import { authService } from '../services/authService.js';

const router = Router();

router.post('/switch-role', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Role switching is disabled in production' } });
  }
  try {
    const { role } = req.body || {};
    if (!role || !req.user?.id) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'role and authenticated user are required' } });
    }
    const data = await authService.switchRole(req.user.id, role, req);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

export default router;
