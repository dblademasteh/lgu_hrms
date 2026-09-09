import * as svc from '../services/rulesService.js';
export const listContributionRulesHandler = async (req,res,next)=>{ try{ res.json(await svc.listContributionRules({})); }catch(e){next(e);} };
export const createContributionRuleHandler = async (req,res,next)=>{ try{ res.status(201).json(await svc.addContributionRule(req.body)); }catch(e){next(e);} };
export const listTaxBracketsHandler = async (req,res,next)=>{ try{ res.json(await svc.listTaxBrackets({})); }catch(e){next(e);} };
export const createTaxBracketHandler = async (req,res,next)=>{ try{ res.status(201).json(await svc.addTaxBracket(req.body)); }catch(e){next(e);} };
export const listLeaveRuleConfigsHandler = async (req,res,next)=>{ try{ res.json(await svc.listLeaveRuleConfigs({})); }catch(e){next(e);} };
export const createLeaveRuleConfigHandler = async (req,res,next)=>{ try{ res.status(201).json(await svc.addLeaveRuleConfig(req.body)); }catch(e){next(e);} };
