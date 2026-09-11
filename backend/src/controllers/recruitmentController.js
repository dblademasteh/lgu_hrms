import * as service from '../services/recruitmentService.js';
export async function listApplicantsHandler(req,res,next){ try{ const page=Number(req.query.page)||1; const limit=Math.min(Number(req.query.limit)||50,200); res.json(await service.listApplicants(req,{page,limit,search:req.query.search,status:req.query.status})); }catch(e){next(e);} }
export async function createApplicantHandler(req,res,next){ try{ res.status(201).json(await service.createApplicant(req, req.body)); }catch(e){next(e);} }
export async function updateApplicantHandler(req,res,next){ try{ res.json(await service.updateApplicant(req, req.params.id, req.body)); }catch(e){next(e);} }
export async function listEligibilitiesHandler(req,res,next){ try{ const page=Number(req.query.page)||1; const limit=Math.min(Number(req.query.limit)||50,200); res.json(await service.listEligibilities(req,{page,limit,employeeId:req.query.employeeId})); }catch(e){next(e);} }
export async function createEligibilityHandler(req,res,next){ try{ res.status(201).json(await service.createEligibility(req, req.body)); }catch(e){next(e);} }
