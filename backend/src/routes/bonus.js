import { Router } from 'express';
import * as ctrl from '../controllers/bonusController.js';
const router = Router();
router.get('/', ctrl.listBonusesHandler);
router.post('/', ctrl.createBonusHandler);
router.patch('/:id', ctrl.updateBonusHandler);
export default router;
