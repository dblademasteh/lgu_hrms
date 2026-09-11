import { departmentsService } from '../services/departmentsService.js';

export const departmentsController = {
  async list(req, res) {
    const departments = await departmentsService.list(req);
    res.json(departments);
  },
  async create(req, res) {
    const department = await departmentsService.create(req, req.body);
    res.status(201).json(department);
  },
  async update(req, res) {
    const department = await departmentsService.update(req, req.params.id, req.body);
    res.json(department);
  },
  async remove(req, res) {
    await departmentsService.remove(req, req.params.id);
    res.status(204).send();
  }
};