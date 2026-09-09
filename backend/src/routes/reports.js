import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/payroll-summary', async (req,res)=>{
  res.json({ report:'payroll-summary', generatedAt:new Date().toISOString(), data:[] });
});

export default router;
