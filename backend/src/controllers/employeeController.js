import { listEmployees, getEmployee } from '../services/employeeService.js';

export async function listEmployeesHandler(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const { search, departmentId, status } = req.query;
    const data = await listEmployees({ page, limit, search, departmentId, status });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function getEmployeeHandler(req, res, next) {
  try {
    const emp = await getEmployee(req.params.id);
    res.json(emp);
  } catch (e) {
    next(e);
  }
}
