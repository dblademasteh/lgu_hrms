import { appointmentsRepository } from '../repositories/appointmentsRepository.js';

const TYPE_MAP = {
  Permanent: 'PERMANENT',
  Temporary: 'TEMPORARY',
  Casual: 'CASUAL',
  Contractual: 'CONTRACTUAL',
  'Job Order': 'JOB_ORDER',
  COS: 'COS',
  Coterminous: 'COTERMINOUS'
};

export const appointmentsService = {
  async list(req) {
    return appointmentsRepository.findAll(req);
  },
  async create(req, data) {
    const mapped = {
      employeeId: data.employeeId ?? data.name,
      type: TYPE_MAP[data.type] ?? data.type?.toUpperCase(),
      itemNumber: data.itemNumber ?? data.itemNo,
      startDate: data.startDate ?? data.start,
      endDate: data.endDate ?? null,
      position: data.position ?? null,
      dept: data.dept ?? null,
      name: data.name ?? null
    };
    return appointmentsRepository.create(req, mapped);
  },
  async update(req, id, data) {
    const mapped = data.type
      ? { ...data, type: TYPE_MAP[data.type] ?? data.type?.toUpperCase() }
      : data;
    return appointmentsRepository.update(req, id, mapped);
  },
  async remove(req, id) {
    return appointmentsRepository.remove(req, id);
  }
};