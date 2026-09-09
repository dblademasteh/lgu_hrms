import { appointmentsService } from '../services/appointmentsService.js';

export const appointmentsController = {
  async list(req, res) {
    const appointments = await appointmentsService.list();
    res.json(appointments);
  },
  async create(req, res) {
    const appointment = await appointmentsService.create(req.body);
    res.status(201).json(appointment);
  },
  async update(req, res) {
    const appointment = await appointmentsService.update(req.params.id, req.body);
    res.json(appointment);
  },
  async remove(req, res) {
    await appointmentsService.remove(req.params.id);
    res.status(204).send();
  }
};