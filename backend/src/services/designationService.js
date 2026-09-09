import * as repo from '../repositories/designationRepository.js';
export const listDesignations = repo.findDesignations;
export const getDesignation = repo.findDesignationById;
export const createDesignation = repo.createDesignation;
export const updateDesignation = repo.updateDesignation;
export const deleteDesignation = repo.deleteDesignation;
