import * as svc from '../services/bonusService.js';
export const listBonusesHandler = async (req,res,next)=>{ try{ res.json(await svc.listBonuses(req, { employeeId:req.query.employeeId })); }catch(e){next(e);} };
export const createBonusHandler = async (req,res,next)=>{ try{ res.status(201).json(await svc.addBonus(req, req.body)); }catch(e){next(e);} };
export const updateBonusHandler = async (req,res,next)=>{ try{ res.json(await svc.updateBonus(req, req.params.id, req.body)); }catch(e){next(e);} };
