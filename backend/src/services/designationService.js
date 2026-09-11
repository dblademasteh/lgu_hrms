import * as repo from '../repositories/designationRepository.js';
export async function listDesignations(req, params) {
  return repo.findDesignations(req, params);
}
export async function getDesignation(req, id) {
  return repo.findDesignationById(req, id);
}
export async function createDesignation(req, data) {
  return repo.createDesignation(req, data);
}
export async function updateDesignation(req, id, data) {
  return repo.updateDesignation(req, id, data);
}
export async function deleteDesignation(req, id) {
  return repo.deleteDesignation(req, id);
}
