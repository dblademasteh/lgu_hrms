import * as svc from '../services/rulesService.js';
export const listContributionRulesHandler = async (req,res,next)=>{ try{ res.json(await svc.listContributionRules(req)); }catch(e){next(e);} };
export const createContributionRuleHandler = async (req,res,next)=>{ try{ res.status(201).json(await svc.addContributionRule(req, req.body)); }catch(e){next(e);} };
export const listTaxBracketsHandler = async (req,res,next)=>{ try{ res.json(await svc.listTaxBrackets(req)); }catch(e){next(e);} };
export const createTaxBracketHandler = async (req,res,next)=>{ try{ res.status(201).json(await svc.addTaxBracket(req, req.body)); }catch(e){next(e);} };
export const listLeaveRuleConfigsHandler = async (req,res,next)=>{ try{ res.json(await svc.listLeaveRuleConfigs(req)); }catch(e){next(e);} };
export const createLeaveRuleConfigHandler = async (req,res,next)=>{ try{ res.status(201).json(await svc.addLeaveRuleConfig(req, req.body)); }catch(e){next(e);} };