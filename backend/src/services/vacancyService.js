import * as repo from '../repositories/vacancyRepository.js';
export const listVacancies = repo.findVacancies;
export const getVacancy = repo.findVacancyById;
export const createVacancy = repo.createVacancy;
export const updateVacancy = repo.updateVacancy;
export const deleteVacancy = repo.deleteVacancy;
