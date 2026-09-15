import { overtimeService } from '../services/overtimeService.js';

export const overtimeController = {
  async list(req, res, next) {
    try {
      const entries = await overtimeService.list(req, req.query);
      res.json(entries);
    } catch (e) {
      next(e);
    }
  },
  async create(req, res, next) {
    try {
      const entry = await overtimeService.create(req, req.body);
      res.status(201).json(entry);
    } catch (e) {
      next(e);
    }
  },
  async update(req, res, next) {
    try {
      const entry = await overtimeService.update(req, req.params.id, req.body);
      res.json(entry);
    } catch (e) {
      next(e);
    }
  },
  async remove(req, res, next) {
    try {
      await overtimeService.remove(req, req.params.id);
      res.json({ message: 'Overtime entry deleted' });
    } catch (e) {
      next(e);
    }
  },
  async approve(req, res, next) {
    try {
      const entry = await overtimeService.approve(req, req.params.id, req.body);
      res.json(entry);
    } catch (e) {
      next(e);
    }
  },
  async estimate(req, res, next) {
    try {
      const data = await overtimeService.estimatePay(req, req.params.id);
      res.json(data);
    } catch (e) {
      next(e);
    }
  },
};