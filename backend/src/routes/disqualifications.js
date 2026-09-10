import { Router } from 'express';
import { disqualificationController } from '../controllers/disqualificationController.js';

const router = Router();

router.get('/', disqualificationController.list);
router.get('/report', disqualificationController.getDibarReport);
router.get('/active', disqualificationController.getActive);
router.get('/:id', disqualificationController.getById);
router.post('/', disqualificationController.create);
router.patch('/:id', disqualificationController.update);
router.delete('/:id', disqualificationController.delete);

export default router;