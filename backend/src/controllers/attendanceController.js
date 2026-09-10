import { attendanceService } from '../services/attendanceService.js';

export const attendanceController = {
  async list(req, res, next) {
    try {
      const attendance = await attendanceService.list(req.query.date);
      res.json(attendance);
    } catch (e) {
      next(e);
    }
  },
  async create(req, res, next) {
    try {
      const record = await attendanceService.create(req.body);
      res.status(201).json(record);
    } catch (e) {
      next(e);
    }
  }
};