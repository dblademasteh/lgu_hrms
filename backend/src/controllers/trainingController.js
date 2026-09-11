import * as service from '../services/trainingService.js';
export async function listProgramsHandler(req,res,next){ try{ const page=Number(req.query.page)||1; const limit=Math.min(Number(req.query.limit)||50,200); res.json(await service.listPrograms(req,{page,limit,search:req.query.search})); }catch(e){next(e);} }
export async function getProgramHandler(req,res,next){ try{ res.json(await service.getProgram(req, req.params.id)); }catch(e){next(e);} }
export async function createProgramHandler(req,res,next){ try{ res.status(201).json(await service.createProgram(req, req.body)); }catch(e){next(e);} }
export async function updateProgramHandler(req,res,next){ try{ res.json(await service.updateProgram(req, req.params.id, req.body)); }catch(e){next(e);} }
export async function deleteProgramHandler(req,res,next){ try{ await service.deleteProgram(req, req.params.id); res.status(204).send(); }catch(e){next(e);} }
export async function listEnrollmentsHandler(req,res,next){ try{ const page=Number(req.query.page)||1; const limit=Math.min(Number(req.query.limit)||50,200); res.json(await service.listEnrollments(req,{page,limit,employeeId:req.query.employeeId,programId:req.query.programId,status:req.query.status})); }catch(e){next(e);} }
export async function createEnrollmentHandler(req,res,next){ try{ res.status(201).json(await service.createEnrollment(req, req.body)); }catch(e){next(e);} }
