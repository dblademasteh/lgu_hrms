import * as repo from '../repositories/bonusRepository.js';
export const listBonuses = repo.findBonuses;
export const addBonus = repo.createBonus;
export const updateBonus = repo.updateBonus;
