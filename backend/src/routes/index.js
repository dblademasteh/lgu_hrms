import { Router } from 'express';
import accountRouter from './account.js';
import authRouter from './auth.js';
import delegationsRouter from './delegations.js';

const router = Router();

router.use('/account', accountRouter);
router.use('/auth', authRouter);
router.use('/delegations', delegationsRouter);

export default router;
