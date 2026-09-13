# Attendance & Biometric System Workflow

## 1. Public Biometric Punch (No Auth Required)

**Endpoint:** `POST /api/v1/attendance/public-punch/punch`

**Purpose:** Allows biometric devices and public kiosks to submit attendance without JWT authentication.

**Request Body:**
```json
{
  "employeeNumber": "EMP-DEFAULT-0001",
  "punchType": "IN" | "OUT",
  "tenantCode": "DEFAULT",
  "deviceId": "device-01"
}
```

**Flow:**
1. Device sends `employeeNumber`, `punchType`, and optional `tenantCode`
2. Backend resolves tenant by `tenantCode` if provided
3. Backend looks up employee by `employeeNumber` within tenant
4. Creates or updates attendance record for today
5. Returns punch result with updated record

**Verified Behavior:**
- Returns `200` with `message` and `record`
- Creates attendance if none exists for today
- Updates existing record on second punch
- CORS restricted to allowed origins

**Security:**
- Mounted before `requireAuth` in `routes/index.js`
- CORS restricted to allowed origins (`localhost:5173`, `5174`, `5175`, `WEB_ORIGIN`)
- For production biometric devices, add device origins to `allowedOrigins` in `backend/src/server.js`

---

## 2. Authenticated Employee Punch

**Endpoint:** `POST /api/v1/attendance/punch`

**Purpose:** Allows logged-in employees to punch in/out from the Attendance Portal.

**Authentication:** JWT required (`req.user.id` → `User.externalId` → `Employee.employeeNumber`)

**Request Body:**
```json
{
  "punchType": "IN" | "OUT"
}
```

**Flow:**
1. Authenticated user sends punch request
2. Backend finds linked employee via `user.externalId`
3. Creates or updates today's attendance record
4. Returns updated record

**Verified Behavior:**
- Returns `200` with `message` and `record`
- Uses `AttendanceRule` to auto-calculate remark if not set
- Auto-marks "On leave" if approved leave exists for today

---

## 3. HR Daily Time Record (DTR) Processing

**Endpoint:** `GET /api/v1/attendance`

**Purpose:** HR views and manages all employee attendance records.

**Authentication:** JWT + Role (`ADMIN`, `HR_MANAGER`, `DEPARTMENT_HEAD`)

**Features:**
- View all attendance records with filtering by date
- Edit records (`PATCH /api/v1/attendance/:id`)
- Delete records (`DELETE /api/v1/attendance/:id`)
- Bulk import from biometric CSV (`POST /api/v1/attendance/import`)
  - CSV format: `employeeNumber, date, timeIn, timeOut, hours, remark`
  - Max 1000 records per import
  - Auto-calculates remarks based on `AttendanceRule`
  - Auto-marks "On leave" if approved leave request exists

**Frontend:** `/attendance` (Attendance DTR page)

---

## 4. Fingerprint Enrollment & Verification

### 4.1 Enrollment

**Endpoint:** `POST /api/v1/biometric/enroll`

**Purpose:** Enroll a fingerprint device/credential for an employee.

**Authentication:** JWT required

**Request Body:**
```json
{
  "credentialId": "cred_1234567890_abc123",
  "publicKey": "publicKey_1234567890_def456",
  "deviceName": "Left Thumb Scanner"
}
```

**Flow:**
1. Employee authenticates and provides device credentials
2. Backend stores `BiometricCredential` linked to employee
3. Credential can be used for future WebAuthn verification

**Database:** `BiometricCredential` model stores:
- `id` — UUID
- `tenantId` — multi-tenancy
- `employeeId` — linked employee
- `credentialId` — unique WebAuthn credential ID
- `publicKey` — WebAuthn public key
- `counter` — replay protection
- `deviceName` — human-readable device name
- `enrolledAt` — enrollment timestamp
- `lastUsedAt` — last successful verification

### 4.2 Verification

**Endpoint:** `POST /api/v1/biometric/verify`

**Purpose:** Verify a WebAuthn biometric assertion and optionally punch attendance.

**Authentication:** None required (public endpoint for device verification)

**Request Body:**
```json
{
  "credentialId": "cred_1234567890_abc123",
  "assertion": "base64-encoded-webauthn-assertion",
  "punchType": "IN" | "OUT" (optional)
}
```

**Flow:**
1. Device sends credential ID + WebAuthn assertion
2. Backend verifies credential exists
3. Increments counter, updates `lastUsedAt`
4. If `punchType` provided, also punches attendance
5. Returns verification result + employee info

### 4.3 List Credentials

**Endpoint:** `GET /api/v1/biometric/credentials`

**Purpose:** Employee views their enrolled fingerprint devices.

**Authentication:** JWT required

### 4.4 Remove Credential

**Endpoint:** `DELETE /api/v1/biometric/credentials/:credentialId`

**Purpose:** Revoke/enroll a fingerprint device.

**Authentication:** JWT required

---

## 5. Attendance Portal (Frontend)

**Route:** `/attendance-portal`

**Features:**
- **Today's Status:** Shows time in, time out, hours, remark
- **Punch In/Out:** Authenticated punch buttons for logged-in employees
- **Kiosk Mode:** Toggle to show public punch form (employee number + tenant code)
- **Monthly Summary:** Stats for total days, punched in/out, hours, on time, tardiness
- **Attendance History:** Table of records for selected month
- **Enrolled Devices:** List of enrolled fingerprint devices with enroll/remove actions

**Verified Workflow:**
1. Employee opens `/attendance-portal`
2. `GET /api/v1/attendance/today` loads today's record
3. `GET /api/v1/attendance/my?month=YYYY-MM` loads history
4. Punch buttons call `POST /api/v1/attendance/punch`
5. Kiosk mode calls `POST /api/v1/attendance/public-punch/punch`
6. Enrollment modal calls `POST /api/v1/biometric/enroll`

---

## 6. Data Model

```
Employee (1) ----< (many) Attendance
Employee (1) ----< (many) BiometricCredential
Tenant   (1) ----< (many) Attendance
Tenant   (1) ----< (many) BiometricCredential
AttendanceRule (1) ----< (many) Attendance
Role     (1) ----< (many) User
```

**BiometricCredential:**
- `id` — UUID
- `tenantId` — multi-tenancy
- `employeeId` — linked employee
- `credentialId` — unique WebAuthn credential ID
- `publicKey` — WebAuthn public key
- `counter` — replay protection
- `deviceName` — human-readable device name
- `enrolledAt` — enrollment timestamp
- `lastUsedAt` — last successful verification

**Role:**
- `id` — UUID
- `name` — role name (e.g. `ADMIN`, `HR_MANAGER`, custom roles)
- `description` — optional description
- `isSystem` — system roles cannot be deleted
- `tenantId` — multi-tenancy
- Composite unique: `[name, tenantId]`

---

## 7. Security Considerations

1. **Biometric data never stored** — only public keys and credential IDs
2. **Fingerprint matching happens on device** — backend only verifies WebAuthn assertions
3. **Public punch endpoint** — no JWT required, but CORS-restricted
4. **Credential counter** — prevents replay attacks
5. **Tenant isolation** — all queries scoped by tenant
6. **Rate limiting** — `apiLimiter` applied to all API routes
7. **Custom roles** — system roles protected from deletion; admins can create tenant-specific roles

---

## 8. Verified Status (2026-09-13)

### Working Endpoints
- `POST /api/v1/attendance/public-punch/punch` — tested with `EMP-DEFAULT-0001`, creates attendance
- `GET /api/v1/attendance/today` — returns today's record or `null`
- `GET /api/v1/attendance/my` — returns employee's attendance history
- `GET /api/v1/attendance` — HR DTR with filtering
- `POST /api/v1/biometric/enroll` — creates credential
- `GET /api/v1/biometric/credentials` — lists enrolled devices
- `DELETE /api/v1/biometric/credentials/:id` — removes credential
- `GET /api/v1/roles` — lists tenant roles
- `POST /api/v1/roles` — creates custom role
- `GET /api/v1/ess/profile`, `/ess/payslips`, `/ess/leave-requests`, `/ess/attendance` — all return `200`

### Frontend Pages Verified
- `/attendance-portal` — loads without errors
- `/attendance` — HR DTR with edit/delete/import
- `/users` — dynamic roles, manage roles modal
- `/recruitment` — `NEW` status filter works

### Recent Fixes
- `attendanceController.js` — added missing `withTenant` import
- `attendanceService.js` — fixed `autoMarkLeave` to use `fromDate`/`toDate` instead of non-existent `startDate`/`endDate`
- `Users.jsx` — replaced stale `ROLES` constant with dynamic `roles` from API
- `ApplicantStatus` — added missing `NEW` enum value
- `Role` model — converted from enum to model; admins can create custom roles per tenant
- `usersService.js` — added `assertRoleExists` validation; `assertLinkable` checks `ACTIVE` status; random temporary passwords
- `performance.js` — added `requireRole('ADMIN', 'HR_MANAGER')`; created Zod validation contract; rating clamped to 1–5; status transition enforcement (`DRAFT→SUBMITTED→APPROVED/REJECTED`); approved reviews cannot be deleted

---

## 9. Future Enhancements

- Integrate `@simplewebauthn/browser` for real WebAuthn enrollment/verification
- Add audit logging for all biometric operations
- Support multiple fingerprint templates per employee
- Add biometric device management for HR admins
- Implement device blacklisting/revocation
- Add attendance anomaly detection
- Add real-time punch notifications
- Implement biometric attendance dashboard with heatmaps
- Design performance matrix/aggregation view (competency scoring, 9-box grid)
- Add IDP management pages (currently orphaned model)
