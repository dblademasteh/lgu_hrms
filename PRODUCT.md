# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + Vite 5 SPA frontend, Express 5 ESM backend, Prisma + PostgreSQL 16. Inherited from existing codebase.

## Users

All LGU employees. Rank-and-file staff access an employee self-service portal (ESS) for payslips, leave filing, and attendance. HR officers, payroll officers, department heads, and auditors operate the administrative back office with role-gated access.

## Product Purpose

Manage the full employee lifecycle for Philippine Local Government Units: personnel records, payroll with statutory deductions, leave and attendance, appointments, audit trail, and reporting. Success means LGUs can run compliant HR operations without stitching together disconnected tools.

## Positioning

Compliance-first LGU HRMS. Built-in adherence to Philippine civil service (CSC), Commission on Audit (COA), and statutory deduction rules (GSIS, PhilHealth, Pag-IBIG, BIR) that generic HRMS products do not natively support. The system treats auditability and regulatory alignment as first-class features, not afterthoughts.

## Operating Context

Deployed per LGU (city/municipality/province) with tenant isolation. Users work in office environments, often under COA audit or CSC plantilla scrutiny. Key documents and artifacts include appointment orders, service records, payroll ledgers, payslips, leave credits, and DTR logs. The product must interface with biometric attendance hardware and statutory reporting deadlines.

## Capabilities and Constraints

- Multi-tenant shared-schema architecture with tenant isolation enforced at every query boundary.
- Role-based access control (RBAC) with five seeded roles: ADMIN, HR_MANAGER, PAYROLL_OFFICER, DEPARTMENT_HEAD, AUDITOR. Custom roles and permissions matrix supported.
- Payroll lifecycle: DRAFT → APPROVED → POSTED with append-only ledger entries and payslip generation.
- Statutory deductions are itemized per regulatory body (GSIS, PhilHealth, Pag-IBIG, BIR) for COA auditability.
- Employee records include plantilla items, employment history, and appointment types (permanent, casual, contractual, temporary).
- Audit middleware captures before/after snapshots for every mutation.
- ESS allows employees to view payslips, file leave requests, and check attendance without HR intervention.
- White-labeling per LGU client is undecided.

## Brand Commitments

Product name is currently `LGU HRMS`. Whether the product is white-labeled per client LGU or remains a fixed brand is undecided. No additional brand assets or voice constraints are documented beyond the design system.

## Evidence on Hand

- `DESIGN.md` — full design system (tokens, components, page specs, accessibility, motion)
- `AGENTS.md` — build spec, codebase map, conventions, and operational runbook
- `FEATURE_GAP_ANALYSIS.md` — feature matrix, prioritized roadmap, and architectural gaps
- `HRMS_Architectural_Comparison.md` — rationale for hybrid layered core + master-detail UI
- `INTEGRATION_GUIDE.md`, `SETUP.md`, `PRE_PRODUCTION_CHECKLIST.md` — operational and integration documentation
- Existing visual implementation: React 19 + Vite 5 + Tailwind 4 frontend with light/dark theming and design-token system
- Prisma schema with 10+ models, enums for roles and payroll statuses, and multi-tenant `tenantId` scoping

## Product Principles

1. Compliance before convenience — every feature is evaluated against CSC, COA, and statutory requirements first.
2. Tenant integrity — multi-tenant isolation is never optional; every query and mutation respects `tenantId`.
3. Auditability by construction — mutations write immutable audit records; financial data never trusts client-sent totals.
4. Quiet productivity — calm, data-first interfaces that let HR and employees complete tasks without decorative friction.

## Accessibility & Inclusion

WCAG 2.1 AA targets are enforced in the design system (contrast ratios verified for both themes, keyboard-first navigation, focus-visible outlines, semantic ARIA on interactive components). No product-specific accessibility requirements beyond the design system have been established.
