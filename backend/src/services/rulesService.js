import * as repo from '../repositories/rulesRepository.js';
export const listContributionRules = repo.findContributionRules;
export const addContributionRule = repo.createContributionRule;
export const listTaxBrackets = repo.findTaxBrackets;
export const addTaxBracket = repo.createTaxBracket;
export const listLeaveRuleConfigs = repo.findLeaveRuleConfigs;
export const addLeaveRuleConfig = repo.createLeaveRuleConfig;
