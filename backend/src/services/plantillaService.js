import * as repo from '../repositories/plantillaRepository.js';

export const listPlantillaItems = repo.findPlantillaItems;
export const getPlantillaItem = repo.findPlantillaItemById;
export const createPlantillaItem = repo.createPlantillaItem;
export const updatePlantillaItem = repo.updatePlantillaItem;
export const deletePlantillaItem = repo.deletePlantillaItem;
