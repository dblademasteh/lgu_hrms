import * as repo from '../repositories/rulesRepository.js';
export const listContributionRules = (req, where = {}) => repo.findContributionRules(req, where);
export const addContributionRule = (req, data) => repo.createContributionRule(req, data);
export const listTaxBrackets = (req, where = {}) => repo.findTaxBrackets(req, where);
export const addTaxBracket = (req, data) => repo.createTaxBracket(req, data);
export const listLeaveRuleConfigs = (req, where = {}) => repo.findLeaveRuleConfigs(req, where);
export const addLeaveRuleConfig = (req, data) => repo.createLeaveRuleConfig(req, data);