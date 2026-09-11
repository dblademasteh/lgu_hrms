import { appointmentsService } from '../services/appointmentsService.js';

export const appointmentsController = {
  async list(req, res) {
    const appointments = await appointmentsService.list(req);
    res.json(appointments);
  },
  async create(req, res) {
    const appointment = await appointmentsService.create(req, req.body);
    res.status(201).json(appointment);
  },
  async update(req, res) {
    const appointment = await appointmentsService.update(req, req.params.id, req.body);
    res.json(appointment);
  },
  async remove(req, res) {
    await appointmentsService.remove(req, req.params.id);
    res.status(204).send();
  }
};