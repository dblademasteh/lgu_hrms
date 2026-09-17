# Employee Self Service (ESS)

## Purpose
Employee Self Service portal allows employees to view their own HR data and file requests without HR intervention.

## Live Features
- **Profile** — Read-only employee profile with personal, family, education, work experience, eligibility, awards.
- **Payslips** — `GET /api/v1/ess/payslips` returns list + printable HTML for approved/posted payslips. ESS-scoped to linked employee via `User.externalId`. (Fix: filter used `employee.id` — was an undeclared `employeeId` that 500d every payslip load.)
- **Leave Requests** — `GET /api/v1/ess/leave-requests` self-scoped. `POST /ess/leave-requests` validated (Zod) and forwards `isHalfDay/isLwop/isTerminal/advanceNoticed/documentUrl`. Half-day stores 0.5 days. Overlap, advance notice, med-cert checks enforced. Approval decrements `LeaveCredit`.
- **Attendance** — `GET /api/v1/ess/attendance` (my attendance), `GET /api/v1/ess/attendance/today`, public kiosk `/attendance/public-punch/punch` (optional punchKey).
- **Notifications** — in-app ESS notifications.

## Security
- ESS routes require JWT + `requireAuth`. Employee linkage via `User.externalId = Employee.employeeNumber`. Non-approvers cannot file on behalf of others. Leave-read leak fixed (self-scoped).
- Link validation (`usersService.assertLinkable`) is tenant-scoped (employee must exist + be ACTIVE in the caller's tenant; duplicate link → 409).
- **Only key-position employees can be linked.** `Employee.keyPosition` (nullable text tag, e.g. `Mayor`, `HRMO`) marks key positions. `POST/PATCH /users` rejects a link to an untagged employee with 400 `NOT_KEY_POSITION`; rank-and-file employees have no ESS account. The Users modal lists only tagged employees (`GET /employees?keyPosition=true`), and the 201 form has a **Key Position** field to set the tag.
- Self-deactivation preserves the employee link (no longer overwrites `externalId` with `DEACTIVATED`), so reactivation via `/users` restores ESS cleanly.
- New accounts created via `/users` are stamped `passwordChangedAt: null` → first login is treated as password-expired (Login redirects to Account → Security to change it).

## Pending
- Leave balance display uses `LeaveCredit` (accrual per month, carry-over). `Leave Balance` UI in ESS currently counts requests not days (follow-up).
- Optional: ESS payslip PDF download via pdfmake.
