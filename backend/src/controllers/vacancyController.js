import * as service from '../services/vacancyService.js';
export async function listHandler(req,res,next){ try{ const page=Number(req.query.page)||1; const limit=Math.min(Number(req.query.limit)||50,200); res.json(await service.listVacancies({page,limit,status:req.query.status,departmentId:req.query.departmentId})); }catch(e){next(e);} }
export async function getHandler(req,res,next){ try{ res.json(await service.getVacancy(req.params.id)); }catch(e){next(e);} }
export async function createHandler(req,res,next){ try{ res.status(201).json(await service.createVacancy(req.body)); }catch(e){next(e);} }
export async function updateHandler(req,res,next){ try{ res.json(await service.updateVacancy(req.params.id,req.body)); }catch(e){next(e);} }
export async function deleteHandler(req,res,next){ try{ await service.deleteVacancy(req.params.id); res.status(204).send(); }catch(e){next(e);} }
