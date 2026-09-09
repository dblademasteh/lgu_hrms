import { attendanceService } from '../services/attendanceService.js';

export const attendanceController = {
  async list(req, res) {
    const attendance = await attendanceService.list(req.query.date);
    res.json(attendance);
  },
  async create(req, res) {
    const record = await attendanceService.create(req.body);
    res.status(201).json(record);
  }
};