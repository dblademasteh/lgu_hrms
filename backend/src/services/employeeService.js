import { findEmployees, findEmployeeById } from '../repositories/employeeRepository.js';

export async function listEmployees(params) {
  return findEmployees(params);
}

export async function getEmployee(id) {
  const emp = await findEmployeeById(id);
  if (!emp) {
    const err = new Error('Employee not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return emp;
}
