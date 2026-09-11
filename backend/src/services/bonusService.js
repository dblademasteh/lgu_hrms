import * as repo from '../repositories/bonusRepository.js';
export const listBonuses = (req, where) => repo.findBonuses(req, where);
export const addBonus = (req, data) => repo.createBonus(req, data);
export const updateBonus = (req, id, data) => repo.updateBonus(req, id, data);
