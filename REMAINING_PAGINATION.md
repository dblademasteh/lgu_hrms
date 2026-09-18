# Remaining Pagination Audit

## Already using shared paginationQuerySchema
- `bonus.js` GET /
- `departments.js` GET /
- `appointments.js` GET /
- `ess.js` GET /profile etc with shape merge
- `leave.js` GET /requests, GET /credits
- `payroll.js` GET /periods
- `positions.js` GET /

## List routes still using custom schemas or no pagination
- `database.js` GET / → databaseController.listTables
- `documents.js` GET / → validate(listDocumentsSchema)
- `attendance.js` GET / → validate(listAttendanceSchema)
- `designation.js` GET / → validate(listDesignationSchema)
- `disqualifications.js` GET / → validate(listDisqualificationsSchema)
- `biometricDevices.js` GET / → no validate
- `delegations.js` GET / → validate(listDelegationsSchema)
- `interviews.js` GET / → validate(listInterviewsSchema)
- `employees.js` GET / → validate(listEmployeesSchema)
- `loans.js` GET / → validate(listLoansSchema)
- `overtime.js` GET / → validate(listOvertimeSchema)
- `plantilla.js` GET / → validate(listPlantillaSchema)
- `performance.js` GET / → requirePermission, no validate
- `tenants.js` GET / → public list, no validate
- `stepIncrementRules.js` GET / → validate(listStepIncrementRulesSchema)
- `vacancyPublications.js` GET / → validate(listVacancyPublicationsSchema)
- `vacancy.js` GET / → validate(listVacancySchema)
- `roles.js` GET / → no validate
- `users.js` GET / → usersController.list, no validate

Next steps: unify custom list schemas to `paginationQuerySchema` + additional filters, implement skip/take + count in corresponding services/repositories.
