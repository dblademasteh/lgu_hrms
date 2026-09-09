import * as service from '../services/plantillaService.js';

export async function listHandler(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const data = await service.listPlantillaItems({ page, limit, departmentId: req.query.departmentId, status: req.query.status });
    res.json(data);
  } catch(e){ next(e); }
}
export async function getHandler(req, res, next) {
  try { res.json(await service.getPlantillaItem(req.params.id)); } catch(e){ next(e); }
}
export async function createHandler(req, res, next) {
  try { res.status(201).json(await service.createPlantillaItem(req.body)); } catch(e){ next(e); }
}
export async function updateHandler(req, res, next) {
  try { res.json(await service.updatePlantillaItem(req.params.id, req.body)); } catch(e){ next(e); }
}
export async function deleteHandler(req, res, next) {
  try { await service.deletePlantillaItem(req.params.id); res.status(204).send(); } catch(e){ next(e); }
}
