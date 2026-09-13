import { appointmentsService } from '../services/appointmentsService.js';

export const appointmentsController = {
  async list(req, res, next) {
    try {
      const appointments = await appointmentsService.list(req);
      res.json(appointments);
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const appointment = await appointmentsService.create(req, req.body);
      res.status(201).json(appointment);
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const appointment = await appointmentsService.update(req, req.params.id, req.body);
      res.json(appointment);
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try {
      await appointmentsService.remove(req, req.params.id);
      res.status(204).send();
    } catch (e) { next(e); }
  },
};
