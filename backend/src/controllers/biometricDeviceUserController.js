import { biometricDeviceUserService } from '../services/biometricDeviceUserService.js';

export const biometricDeviceUserController = {
  async listByDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const mappings = await biometricDeviceUserService.listByDevice(req, deviceId);
      res.json({ mappings, deviceId });
    } catch (e) {
      next(e);
    }
  },

  async listByEmployee(req, res, next) {
    try {
      const { employeeId } = req.params;
      const mappings = await biometricDeviceUserService.listByEmployee(req, employeeId);
      res.json({ mappings, employeeId });
    } catch (e) {
      next(e);
    }
  },

  async create(req, res, next) {
    try {
      const { deviceId } = req.params;
      const { deviceUserId, employeeId } = req.body;
      if (!deviceUserId || !employeeId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'deviceUserId and employeeId are required' } });
      }
      const mapping = await biometricDeviceUserService.create(req, deviceId, { deviceUserId, employeeId });
      res.status(201).json({ mapping });
    } catch (e) {
      next(e);
    }
  },

  async update(req, res, next) {
    try {
      const { deviceId, deviceUserId } = req.params;
      const { employeeId, deviceUserId: newDeviceUserId } = req.body;
      const mapping = await biometricDeviceUserService.update(req, deviceId, deviceUserId, { employeeId, deviceUserId: newDeviceUserId });
      res.json({ mapping });
    } catch (e) {
      next(e);
    }
  },

  async delete(req, res, next) {
    try {
      const { deviceId, deviceUserId } = req.params;
      await biometricDeviceUserService.delete(req, deviceId, deviceUserId);
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
};
