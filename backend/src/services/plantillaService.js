import * as repo from '../repositories/plantillaRepository.js';

export async function listPlantillaItems(req, params) {
  return repo.findPlantillaItems(req, params);
}
export async function getPlantillaItem(req, id) {
  return repo.findPlantillaItemById(req, id);
}
export async function createPlantillaItem(req, data) {
  return repo.createPlantillaItem(req, data);
}
export async function updatePlantillaItem(req, id, data) {
  return repo.updatePlantillaItem(req, id, data);
}
export async function deletePlantillaItem(req, id) {
  return repo.deletePlantillaItem(req, id);
}
