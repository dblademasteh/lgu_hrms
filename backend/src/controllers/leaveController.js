import { leaveService } from '../services/leaveService.js';

export const leaveController = {
  async listRequests(req, res) {
    const requests = await leaveService.listRequests();
    res.json(requests);
  },
  async createRequest(req, res) {
    const request = await leaveService.createRequest(req.body);
    res.status(201).json(request);
  },
  async updateRequest(req, res) {
    const request = await leaveService.updateRequest(req.params.id, req.body);
    res.json(request);
  },
  async listCredits(req, res) {
    const credits = await leaveService.listCredits(req.query.employeeId);
    res.json(credits);
  }
};