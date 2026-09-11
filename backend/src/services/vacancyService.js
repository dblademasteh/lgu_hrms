import * as repo from '../repositories/vacancyRepository.js';
export const listVacancies = (req, opts) => repo.findVacancies(req, opts);
export const getVacancy = (req, id) => repo.findVacancyById(req, id);
export const createVacancy = (req, data) => repo.createVacancy(req, data);
export const updateVacancy = (req, id, data) => repo.updateVacancy(req, id, data);
export const deleteVacancy = (req, id) => repo.deleteVacancy(req, id);
