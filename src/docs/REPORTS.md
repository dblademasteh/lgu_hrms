# Reports — Deep Dive (Sep 2026)

> Hardening pass over the **Reports & Exports** surface: the Reports page, the single live backend report endpoint, and every ad-hoc CSV export in the app.
> Benchmark: COA prescribed reports (Payroll Register, Payroll Journal, Remittance reports, Certificate of Compensation), CSC Service Record / leave cards, PRIME-HRM report catalog.
> Verify gates: `node --check`, `npm run build`, color lint.

## Scope (surfaces)

| Surface | Route / file | Backend | Roles |
|---|---|---|---|
| Reports page | `/reports` (`Reports.jsx`) | `GET /reports/payroll-summary` only | ADMIN, HR_MANAGER, PAYROLL_OFFICER, AUDITOR, SUPER_ADMIN |
| Ad-hoc CSV exports | `Audit.jsx`, `Employees.jsx`, `Disqualifications.jsx`, `Attendance.jsx` (sample), `Reports.jsx` (summary) | none (client-side) | page-gated authed users |
| Ops downloads | `DatabaseTools.jsx`/`Settings.jsx` | `databaseController` CSV/JSON/backup endpoints, `account /*export*` | SUPER_ADMIN / self |

## What is already wired (verified)

- **Payroll Summary is real.** `GET /reports/payroll-summary` aggregates `PayrollItem` (`_count`, `_sum`) under `withTenant`; supports `?runId=` / `?periodId=`, defaults to latest run; reports the run's `status`. Reports.jsx renders 8 stat tiles + one-row CSV download (client-side blob, quoted+escaped).
- Frontend route gated `reports` capability; backend route gated by `requirePermission('reports')` (ADMIN/HR_MANAGER/PAYROLL_OFFICER/AUDITOR). No role drift.
- CSV export patterns elsewhere (Audit, Employees, Disqualifications) are real on-page operations over already-loaded JSON.

## Findings

### High
1. **"Standard Reports" is a stub catalogue.** `data/reports.js` holds 4 hardcoded templates (COA Payroll Register, Payroll Journal, Employee Master List, Service Record); "Generate" = toast (`Reports.jsx:114`), preview = "not yet generated" (`:143-144`). **pdfmake/ExcelJS are not installed** in either package.json yet the header badge (`:56`) claims them; Help.jsx and FEATURE_GAP_ANALYSIS.md advertise the same. Nothing renders — this is the #1 gap against the COA/PRIME-HRM benchmark.
2. **Backend has exactly one report endpoint.** No server-side CSV/PDF/Excel for any report; nothing for attendance/DTR, leave, loans, remittances, or the COA register family. Every export that exists is a client-side single-page CSV with **no shared util** — 5+ near-identical blob/download implementations (Reports/Audit/Employees/Disqualifications/Attendance sample) with divergent quoting (Audit/Attendance join unquoted; Reports quotes+escapes; Employees joins raw).
3. **Summary shows unposted runs.** The "latest run" branch (`reportsController.js:28-33`) is by `runDate` desc with **no status filter** → a DRAFT or APPROVED run shows in compliance-facing numbers before posting. ESS already hides non-POSTED (fixed in the payroll P1 batch); payroll summary should match.
4. **Summary is run-level only.** The listed "COA Payroll Register" needs **per-employee rows and per-deduction-code columns** (basic + allowances + each contribution/loan/tax code + net). Current `payrollSummary` returns one aggregate row — can't feed the register, journal, or Certificate of Compensation.
5. **No remittance support.** GSIS RS, Pag-IBIG, PhilHealth, and BIR 1601-C reports need sums **grouped by deduction `code`** (`PayrollDeductionLine.code`). No endpoint exposes line-level totals; the data is there (lines are stored with `code`/`employeeShare`).

### Medium
6. **Client-side CSVs aren't decimal-safe or Manila-dated.** Filenames use `new Date().toISOString().slice(0,10)` (UTC); AUDITOR-exported audit CSV differs in formatting from the employees CSV. Dates elsewhere render `String(runDate).slice(0,10)`.
7. **No report catalogue in the backend / no docs.** `FEATURE_GAP_ANALYSIS.md` row 12 and Help.jsx promise a pipeline that doesn't exist — pages in the app are telling users a feature exists ("Download as PDF" in Help for Payslips; the payslip print is HTML, not PDF).
8. **Preview modal claims** `PDF Document / Excel Workbook` for a stub (`Reports.jsx:136,143`) — misleads until the renderer lands.

## Benchmark — COA / CSC / PRIME-HRM best practice

- **COA Payroll Register (check #M2):** per payroll-period, per regular payee: GSIS No., item/position, monthly salary by `Basic + PERA/allowances + other`, deductions columnized (withholding, GSIS, premiums, Pag-IBIG, PhilHealth, loans, other), net pay, amount realized (withdrawal), payee signature. Current data model supports it (employees + items + lines); no renderer.
- **COA Payroll Journal (#M3~M7):** debit/credit entries per account class — `Salaries & Wages`, `PERA`, contributions payable, loans payable, tax payable — derived from the `LedgerEntry` trail (types `PAY`/`DEDUCTION`). `LedgerEntry` rows exist post-posting, so a journal generator is feasible.
- **Remittances:** GSIS RSP/RS forms, Pag-IBIG MDF, PhilHealth MDR, BIR 1601-C (monthly). Need `PayrollDeductionLine.code` group-sums by run. These are the reports auditors actually pull monthly.
- **COA Certificate of Compensation:** signed heads' certification (cash + non-cash) per employee for the period — recurring annual submission; today only the HTML payslip approximates it.
- **CSC/PRIME-HRM:** Service Record (CSC Master Employment Record) — needs appointments + leave + service continuity; attendance/DTR reports; leave balance/leave card reports (CS Form 6). None exist as exports.
- **Report serving hygiene:** COA reports should be **server-generated** (audit-proof, shareable, printable on A4) rather than client blobs; authenticated download with audit trail (global mount already writes one).

## Hardening plan

### P1 (do now — stop the lies)
- [ ] **Remove the fake "Standard Reports" claims:** drop the `pdfmake · ExcelJS` badge + stub Generate/preview, or gate the catalogue behind a real renderer. Update Help.jsx + FEATURE_GAP_ANALYSIS.md to reflect reality.
- [ ] **Status-gate the summary**: exclude non-POSTED runs from the default `latest run` branch (`reportsController.js`).
- [ ] **Shared client export util** (`frontend/src/lib/export.js`: `downloadCsv(rows, name)` with quoting + Manila date filename) and adopt it across Reports/Audit/Employees/Disqualifications/Attendance.

### P2 — server-side report engine
- [ ] **Line-level payroll report endpoint** `GET /reports/payroll-register?runId=` (or `periodId`): per-employee rows + per-`code` deduction columns + net, Decimal-safe, CSV + JSON. Replace the one-row summary CSV.
- [ ] **Journal + remittance reports** from `LedgerEntry` and line `code` groups; `GET /reports/payroll-journal`, `GET /reports/remittance/{type}`.

### P3 — renderers & expanded catalogue
- [ ] Install pdfmake (PDF) + ExcelJS or server-side table-render to CSV/XLSX; wire "Standard Reports" (COA Register, Journal, Employee Master List, Service Record) as real downloads.
- [ ] Payroll Summary gains per-period multi-run view; add attendance/DTR + leave reports; payslip **PDF download** (have printable HTML already).
- [ ] Manila date in all export filenames; Decimal-safe money in CSV columns.

## Money / dates / audit

- The engine is Decimal-only; exports must serialize Decimals as strings (they do via `toLocaleString`, but CSV columns should preserve 2dp form).
- Dates: UTC in data, Asia/Manila in filenames/labels (`lib/time.js`); export filenames currently UTC.
- Audit: only the payroll-summary GET is non-mutating (no audit write needed); a server-side report endpoint will pass through the global mount on nothing (GET) — report *download* events could be logged explicitly if required by policy.