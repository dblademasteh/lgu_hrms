import * as repo from '../repositories/vacancyPublicationRepository.js';

export const vacancyPublicationService = {
  list: (req, params) => repo.findPublications(req, params),
  create: (req, data) => repo.createPublication(req, data),
  delete: (req, id) => repo.deletePublication(req, id),
};
