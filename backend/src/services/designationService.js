import * as repo from '../repositories/designationRepository.js';

const DATE_FIELDS = ['issuedDate', 'effectiveDate', 'expirationDate'];
const toUtcDate = (value) => (value ? new Date(`${value}T00:00:00.000Z`) : null);

function coerceDates(data) {
  const payload = { ...data };
  for (const field of DATE_FIELDS) {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
      payload[field] = toUtcDate(payload[field]);
    } else if (payload[field] === '') {
      payload[field] = null;
    }
  }
  return payload;
}

export async function listDesignations(req, params) {
  return repo.findDesignations(req, params);
}
export async function getDesignation(req, id) {
  return repo.findDesignationById(req, id);
}
export async function createDesignation(req, data) {
  return repo.createDesignation(req, coerceDates(data));
}
export async function updateDesignation(req, id, data) {
  return repo.updateDesignation(req, id, coerceDates(data));
}
export async function deleteDesignation(req, id) {
  return repo.deleteDesignation(req, id);
}
