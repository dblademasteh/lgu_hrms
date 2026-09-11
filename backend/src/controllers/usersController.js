import { usersService } from '../services/usersService.js';

export const usersController = {
  async list(req, res) {
    const users = await usersService.list(req);
    res.json(users);
  },
  async create(req, res) {
    const user = await usersService.create(req, req.body);
    res.status(201).json(user);
  },
  async update(req, res) {
    const user = await usersService.update(req, req.params.id, req.body);
    res.json(user);
  },
  async remove(req, res) {
    await usersService.remove(req.params.id);
    res.json({ message: 'User deleted' });
  }
};