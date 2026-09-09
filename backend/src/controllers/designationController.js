import * as service from '../services/designationService.js';
export async function listHandler(req,res,next){ try{ const page=Number(req.query.page)||1; const limit=Math.min(Number(req.query.limit)||50,200); res.json(await service.listDesignations({page,limit,employeeId:req.query.employeeId})); }catch(e){next(e);} }
export async function getHandler(req,res,next){ try{ res.json(await service.getDesignation(req.params.id)); }catch(e){next(e);} }
export async function createHandler(req,res,next){ try{ res.status(201).json(await service.createDesignation(req.body)); }catch(e){next(e);} }
export async function updateHandler(req,res,next){ try{ res.json(await service.updateDesignation(req.params.id,req.body)); }catch(e){next(e);} }
export async function deleteHandler(req,res,next){ try{ await service.deleteDesignation(req.params.id); res.status(204).send(); }catch(e){next(e);} }
