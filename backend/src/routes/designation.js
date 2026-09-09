import { Router } from 'express';
import * as ctrl from '../controllers/designationController.js';
const router=Router();
router.get('/',ctrl.listHandler);
router.get('/:id',ctrl.getHandler);
router.post('/',ctrl.createHandler);
router.patch('/:id',ctrl.updateHandler);
router.delete('/:id',ctrl.deleteHandler);
export default router;
