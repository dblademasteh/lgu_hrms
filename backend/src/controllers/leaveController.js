import { leaveService } from '../services/leaveService.js';
import { leaveRepository } from '../repositories/leaveRepository.js';

export const leaveController = {
  async listRequests(req, res, next) {
    try {
      const requests = await leaveService.listRequests(req);
      res.json(requests);
    } catch (e) {
      next(e);
    }
  },
  async createRequest(req, res, next) {
    try {
      const request = await leaveService.createRequest(req, req.body);
      res.status(201).json(request);
    } catch (e) {
      next(e);
    }
  },
  async updateRequest(req, res, next) {
    try {
      const request = await leaveService.updateRequest(req, req.params.id, req.body);
      res.json(request);
    } catch (e) {
      next(e);
    }
  },
  async listCredits(req, res, next) {
    try {
      const credits = await leaveService.listCredits(req, req.query.employeeId);
      res.json(credits);
    } catch (e) {
      next(e);
    }
  },
  async reconcile(req, res, next) {
    try {
      const credits = await leaveService.reconcile(req, req.body.employeeId);
      res.json(credits);
    } catch (e) {
      next(e);
    }
  },
  async monetize(req, res, next) {
    try {
      const result = await leaveService.monetize(req, req.params.id, req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
  // API-key integration surface (x-api-key + leave:read). Read-only: the
  // tenant comes from the key, never from the request body.
  async integrationListRequests(req, res, next) {
    try {
      const result = await leaveRepository.findIntegrationRequests(req, req.query);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
  async integrationListCredits(req, res, next) {
    try {
      const result = await leaveRepository.findIntegrationCredits(req, req.query);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },
};