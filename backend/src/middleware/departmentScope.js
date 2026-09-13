/**
 * Department scoping for DEPARTMENT_HEAD role.
 *
 * Rules:
 * - SUPER_ADMIN, ADMIN, HR_MANAGER, PAYROLL_OFFICER, AUDITOR: no department scoping (null)
 * - DEPARTMENT_HEAD: scoped to their own departmentId
 * - Any authenticated user without a departmentId: no scoping (returns null)
 */

const ROLE_RANK = {
  AUDITOR: 0,
  DEPARTMENT_HEAD: 1,
  PAYROLL_OFFICER: 2,
  HR_MANAGER: 3,
  ADMIN: 4,
};

export function getDepartmentScope(req) {
  const role = req.user?.role;
  const departmentId = req.user?.departmentId;
  
  // Only DEPARTMENT_HEAD gets scoped; all higher roles see everything
  if (role === 'DEPARTMENT_HEAD' && departmentId) {
    return departmentId;
  }
  
  return null;
}

export function assertDepartmentAccess(req, targetDepartmentId) {
  const scope = getDepartmentScope(req);
  if (scope && targetDepartmentId !== scope) {
    const err = new Error('Cross-department access denied');
    err.status = 403;
    err.code = 'DEPARTMENT_FORBIDDEN';
    throw err;
  }
}
