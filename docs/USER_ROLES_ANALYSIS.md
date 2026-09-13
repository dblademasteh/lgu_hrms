# User & Roles System Analysis

## 1. Core Concept: Two Separate Tables

### User Table (Authentication & Authorization)
**Purpose:** System login accounts, RBAC, session management

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `username` | String @unique | Login identifier |
| `passwordHash` | String | Bcrypt password hash |
| `pinHash` | String? | Optional PIN for quick login |
| `role` | String | Role name (e.g. `ADMIN`, `HR_MANAGER`, custom) |
| `departmentId` | String? | Department scope for this user |
| `externalId` | String? | **Link to Employee.employeeNumber** |
| `tenantId` | String? | Multi-tenancy |
| `status` | String | `ACTIVE` / `INACTIVE` |
| `twoFactorEnabled` | Boolean | 2FA flag |
| `displayPrefs` | Json? | UI preferences |

**Key Points:**
- `role` is a plain string, not an enum — allows custom roles
- `externalId` stores the linked `Employee.employeeNumber`
- `departmentId` scopes what department data this user can access
- No personal HR data like birth date, address, etc. — that's in Employee

### Employee Table (HR Master Data)
**Purpose:** Employee records, payroll, attendance, leave, performance

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `employeeNumber` | String @unique | Employee ID (e.g. `EMP-DEFAULT-0001`) |
| `firstName` | String | Given name |
| `lastName` | String | Family name |
| `middleName` | String? | Optional middle name |
| `birthDate` | DateTime | Date of birth |
| `gender` | String | Gender |
| `civilStatus` | String | Civil status |
| `address` | String | Residential address |
| `contactNumber` | String? | Phone |
| `email` | String? | Email |
| `status` | EmploymentStatus | `ACTIVE` / `INACTIVE` / `RESIGNED` / `RETIRED` |
| `departmentId` | String | Department assignment |
| `positionId` | String | Position assignment |
| `hiredDate` | DateTime | Date of hire |
| `tenantId` | String? | Multi-tenancy |

**Key Points:**
- `employeeNumber` is the natural key used throughout the system
- Contains all HR-related data
- No password, no login credentials
- `status` tracks employment status, not account status

### Role Table (RBAC)
**Purpose:** Named roles with optional descriptions, per-tenant

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `name` | String | Role name (e.g. `ADMIN`, `HR_MANAGER`) |
| `description` | String? | Human-readable description |
| `isSystem` | Boolean | System roles cannot be deleted |
| `tenantId` | String? | Multi-tenancy |
| `createdAt` | DateTime | Timestamp |
| `updatedAt` | DateTime | Timestamp |

**Unique Constraint:** `[name, tenantId]` — each tenant can have the same role names

---

## 2. Relationship Diagram

```
User (auth)
  ├── role: String → Role.name (soft reference)
  ├── departmentId → Department.id
  ├── externalId → Employee.employeeNumber (soft link)
  └── tenantId → Tenant.id

Employee (HR data)
  ├── employeeNumber: unique natural key
  ├── departmentId → Department.id
  ├── positionId → Position.id
  ├── attendances → Attendance[]
  ├── leaveRequests → LeaveRequest[]
  ├── payrollItems → PayrollItem[]
  └── linkedUsers ← User[] (reverse of externalId link)

Role
  ├── name: unique per tenant
  ├── description
  └── isSystem: boolean
```

**Important:** The link between User and Employee is **soft** — it's via `User.externalId = Employee.employeeNumber`, not a foreign key constraint. This allows:
- Users without employee records (admin accounts, service accounts)
- Employees without user accounts (ESS not enabled)
- One employee linked to only one user account

---

## 3. Authentication Flow

### 3.1 Login
```
POST /api/v1/auth/login
Body: { username, password }
→ authService.login()
→ Find User by username
→ bcrypt.compare(password, passwordHash)
→ Check user.status !== 'INACTIVE'
→ issueSession(user, req)
→ Returns: { accessToken, refreshToken, user: { id, username, role, tenantId } }
```

**Access Token JWT Payload:**
```json
{
  "id": "user-uuid",
  "role": "ADMIN",
  "tenantId": "tenant-default",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 3.2 Refresh
```
POST /api/v1/auth/refresh
Body: { refreshToken }
→ Verify refresh token
→ Re-read User from DB (gets live role/tenant)
→ Issue new access token with current role/tenant
→ Returns: { accessToken }
```

**Why re-read user?** Role or tenant changes take effect immediately on refresh without requiring re-login.

### 3.3 Session Storage
- `UserSession` table tracks device-based sessions
- Session ID: `session-{userId}-{deviceHash}`
- `deviceHash` = base64(ip + user-agent), truncated to 32 chars
- Upsert on login, updates `lastActive`

---

## 4. RBAC Implementation

### 4.1 Middleware
```javascript
// middleware/rbac.js
export function requireRole(...allowed) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }
    next();
  };
}
```

**Usage:**
```javascript
router.get('/', requireRole('ADMIN'), controller.list);
```

### 4.2 Role Checking
- `req.user.role` comes from JWT payload
- JWT is signed with `JWT_SECRET`
- Role is a string, compared against allowed array
- No database lookup on every request — role is embedded in token

### 4.3 Route Protection
```
routes/index.js:
router.use('/auth', authRouter)           // PUBLIC
router.use('/integrations', integrationsRouter)  // PUBLIC
router.use('/', requireAuth)              // PROTECTED
router.use('/', tenantContext)            // SCOPED
router.use('/', auditLog)                 // AUDITED
```

---

## 5. ESS (Employee Self-Service) Workflow

### 5.1 Link User to Employee
```
POST /api/v1/users (ADMIN only)
Body: {
  username: "j.santos",
  role: "EMPLOYEE",
  externalId: "EMP-DEFAULT-0001",
  departmentId: "...",
  ...
}
→ usersService.assertLinkable(externalId)
  → Checks Employee.employeeNumber exists
  → Checks no other User already linked to this employee
→ Creates User with externalId = Employee.employeeNumber
```

### 5.2 ESS Access
```
Employee logs in → JWT contains role
→ Visits /ess
→ Frontend calls:
  GET /api/v1/ess/profile
    → Finds User by req.user.id
    → Gets User.externalId (employeeNumber)
    → Finds Employee by employeeNumber
    → Returns profile + department + position + leave credits
  
  GET /api/v1/ess/payslips
    → Finds Employee by user.externalId
    → Returns PayrollItem[] with employee filter
  
  GET /api/v1/ess/leave-requests
    → Finds Employee by user.externalId
    → Returns LeaveRequest[] for that employee
  
  POST /api/v1/ess/leave-requests
    → Finds Employee by user.externalId
    → Creates LeaveRequest for that employee
```

### 5.3 ESS Data Isolation
- All ESS endpoints resolve employee from `req.user.externalId`
- Employee can only see their own data
- No employeeNumber parameter in request — derived from auth

---

## 6. User Creation Workflows

### 6.1 Admin Creates System User
```
POST /api/v1/users (ADMIN only)
Body: {
  username: "admin-tarlac",
  role: "ADMIN",
  tenantId: "tenant-tarlac",
  externalId: null,  // No employee link
  ...
}
→ Creates User without employee linkage
→ Password: "changeme" (forced change on first login)
→ User can access system but NOT ESS
```

### 6.2 Admin Creates Employee User
```
POST /api/v1/users (ADMIN only)
Body: {
  username: "m.santos",
  role: "EMPLOYEE",  // or custom role
  externalId: "EMP-DEFAULT-0001",
  ...
}
→ Links to existing employee
→ Employee can now use ESS
→ Password: "changeme"
```

### 6.3 Employee Self-Registration
```
Not implemented — all users must be created by ADMIN
```

---

## 7. Role Management Workflow

### 7.1 System Roles (Seeded)
- `ADMIN` — full access
- `HR_MANAGER` — HR operations
- `PAYROLL_OFFICER` — payroll operations
- `DEPARTMENT_HEAD` — department-specific approvals
- `AUDITOR` — read-only audit access

### 7.2 Custom Roles (Admin-Created)
```
POST /api/v1/roles (ADMIN only)
Body: { name: "CASHIER", description: "Handles cash transactions" }
→ Creates Role with isSystem: false
→ Can be assigned to users
→ Can be deleted (unlike system roles)
```

### 7.3 Role Assignment
- Role is assigned at user creation: `POST /api/v1/users` with `role: "CASHIER"`
- Role is updated at user edit: `PATCH /api/v1/users/:id` with `role: "CASHIER"`
- Role is embedded in JWT on login/refresh
- Role is checked by `requireRole()` middleware on protected routes

---

## 8. Key Findings & Recommendations

### 8.1 Current Architecture Strengths
1. **Clean separation:** User handles auth, Employee handles HR data
2. **Optional linkage:** Not all users need employee records (admins, service accounts)
3. **Flexible roles:** String-based roles allow custom roles per tenant
4. **Multi-tenancy:** Both tables scoped by tenantId
5. **Soft delete:** Employee has `deletedAt`, User has `status`

### 8.2 Current Issues

#### Issue 1: No Foreign Key on externalId
```
User.externalId → Employee.employeeNumber
```
- Not a foreign key constraint in Prisma
- Risk: Employee deleted, User still linked to stale employeeNumber
- **Recommendation:** Add soft-delete guard in `assertLinkable()` — check `deletedAt: null`

#### Issue 2: Role is Redundant with Role Table
```
User.role: String
Role.name: String
```
- `User.role` stores the role name as a string
- `Role` table exists but isn't enforced as foreign key
- Risk: User assigned role that doesn't exist in Role table
- **Recommendation:** Either:
  - Add foreign key `User.role → Role.name`
  - Or remove Role table and keep string-based roles

#### Issue 3: No Audit Trail for Role Changes
- When `User.role` is updated, no audit log entry
- **Recommendation:** Add audit logging in `usersService.update()` for role changes

#### Issue 4: No Employee-Creation-Triggers-User-Creation
- HR creates Employee, but no automatic User account is created
- Employee can't use ESS until admin manually creates User and links
- **Recommendation:** Add optional auto-user-creation on employee creation, or provide ESS invite flow

#### Issue 5: Password "changeme" is Hardcoded
```javascript
const passwordHash = await bcrypt.hash('changeme', 12);
```
- All new users get same default password
- **Recommendation:** Generate random password and send via email, or force password reset on first login

---

## 9. Workflow Summary

### 9.1 Typical Admin Flow
1. Admin logs in → `POST /auth/login` → JWT with `role: ADMIN`
2. Admin creates department → `POST /api/v1/departments`
3. Admin creates position → `POST /api/v1/positions`
4. Admin creates employee → `POST /api/v1/employees`
5. Admin creates user → `POST /api/v1/users` with `externalId: employee.employeeNumber`
6. Admin assigns role → `role: "HR_MANAGER"` in user creation/update
7. Employee receives credentials → logs in → accesses ESS

### 9.2 Typical Employee Flow
1. Employee receives credentials from admin
2. Employee logs in → `POST /auth/login` → JWT with `role: EMPLOYEE`
3. Employee visits `/ess` → sees profile, payslips, leave, attendance
4. Employee files leave → `POST /api/v1/ess/leave-requests`
5. Employee views attendance → `GET /api/v1/ess/attendance`

### 9.3 Role Change Flow
1. Admin edits user → `PATCH /api/v1/users/:id` with new `role`
2. User must re-login or refresh token to get new role
3. Refresh endpoint re-reads user from DB, issues new JWT with updated role

### 9.4 ESS Linkage Flow
```
1. Admin creates Employee (HR data only)
2. Admin creates User with externalId = Employee.employeeNumber
3. User logs in
4. ESS endpoints resolve employee from user.externalId
5. All ESS data scoped to that employee
```

---

## 10. Database State (Current)

**Users:** 10 total
- `admin-default` → linked to `EMP-DEFAULT-0003`
- `hr_manager-default` → linked to `EMP-DEFAULT-0001`
- `payroll_officer-default` → linked to `EMP-DEFAULT-0002`
- `admin-tarlac` → linked to `EMP-TARLAC-0003`
- `hr_manager-tarlac` → linked to `EMP-TARLAC-0001`
- `payroll_officer-tarlac` → linked to `EMP-TARLAC-0002`
- `department_head-default` → unlinked
- `auditor-default` → unlinked
- `department_head-tarlac` → unlinked
- `auditor-tarlac` → unlinked

**Employees:** 10 total (5 per tenant)

**Roles:** 10 total (5 system roles × 2 tenants) + 1 custom role (`Employee` in DEFAULT)
