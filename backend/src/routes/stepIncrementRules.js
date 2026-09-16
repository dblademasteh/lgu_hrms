import { Router } from 'express';
import { listStepIncrementRulesHandler, getStepIncrementRuleHandler, createStepIncrementRuleHandler, updateStepIncrementRuleHandler, deleteStepIncrementRuleHandler } from '../controllers/stepIncrementRuleController.js';
import { validate } from '../middleware/validate.js';
import { requirePermission } from '../middleware/permission.js';
import { createStepIncrementRuleSchema, updateStepIncrementRuleSchema, stepIncrementRuleIdSchema, listStepIncrementRulesSchema } from '../shared/contracts/stepIncrementRules.js';

const router = Router();

router.use(requirePermission('manageUsersAndRoles'));

router.get('/', validate(listStepIncrementRulesSchema), listStepIncrementRulesHandler);
router.get('/:id', validate(stepIncrementRuleIdSchema), getStepIncrementRuleHandler);
router.post('/', validate(createStepIncrementRuleSchema), createStepIncrementRuleHandler);
router.patch('/:id', validate(updateStepIncrementRuleSchema), updateStepIncrementRuleHandler);
router.delete('/:id', validate(stepIncrementRuleIdSchema), deleteStepIncrementRuleHandler);

export default router;
