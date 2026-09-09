import { Router } from 'express';
import { loginHandler, refreshHandler } from '../controllers/authController.js';

const router = Router();

router.post('/login', loginHandler);
router.post('/refresh', refreshHandler);

export default router;
