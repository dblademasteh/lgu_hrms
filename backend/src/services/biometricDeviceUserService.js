import { biometricDeviceUserRepository } from '../repositories/biometricDeviceUserRepository.js';

export const biometricDeviceUserService = {
  async listByDevice(req, deviceId) {
    return biometricDeviceUserRepository.findByDevice(req, deviceId);
  },

  async listByEmployee(req, employeeId) {
    return biometricDeviceUserRepository.findByEmployee(req, employeeId);
  },

  async create(req, deviceId, data) {
    const existing = await biometricDeviceUserRepository.findByDeviceUser(req, deviceId, data.deviceUserId);
    if (existing) {
      const err = new Error(`Device user ID "${data.deviceUserId}" is already mapped on this device`);
      err.status = 409;
      err.code = 'DUPLICATE';
      throw err;
    }
    return biometricDeviceUserRepository.create(req, { ...data, deviceId });
  },

  async update(req, deviceId, deviceUserId, data) {
    const existing = await biometricDeviceUserRepository.findByDeviceUser(req, deviceId, deviceUserId);
    if (!existing) {
      const err = new Error('Mapping not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (data.deviceUserId && data.deviceUserId !== deviceUserId) {
      const clash = await biometricDeviceUserRepository.findByDeviceUser(req, deviceId, data.deviceUserId);
      if (clash) {
        const err = new Error(`Device user ID "${data.deviceUserId}" is already mapped on this device`);
        err.status = 409;
        err.code = 'DUPLICATE';
        throw err;
      }
    }
    return biometricDeviceUserRepository.update(req, deviceId, deviceUserId, data);
  },

  async delete(req, deviceId, deviceUserId) {
    const existing = await biometricDeviceUserRepository.findByDeviceUser(req, deviceId, deviceUserId);
    if (!existing) {
      const err = new Error('Mapping not found');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return biometricDeviceUserRepository.delete(req, deviceId, deviceUserId);
  },
};
