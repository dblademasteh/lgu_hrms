# DTMS-H — Housekeeping Backlog

Not a feature module — the small correctness/consistency fixes found during the P0
deep dive that the feature modules depend on or that would otherwise be forgotten.
Do these **first (phase 0)** because M2/M7 build on normalized storage and the seed.

## Fixes
- [ ] **Storage path normalization:** `documentService.createDocument`/`updateDocument`
  store `url = /uploads/documents/<file>`. Normalize to a relative
  `uploads/documents/<file>` value so nothing depends on a leading-slash path.
  Backfill existing rows with a migration or a one-off script; keep
  `resolveFilePath` tolerant of both during the transition.
- [ ] **fileSize display:** the table renders `${fileSize} KB` but the field is bytes.
  Format bytes → B/KB/MB in `Documents.jsx`.
- [ ] **Pagination with filters:** changing a filter keeps the stale page number
  (`useEffect [page, filters]`). Reset `page` to 1 on filter change.
- [ ] **Unused stats:** either render document status cards (DRAFT/PENDING/APPROVED/
  PUBLISHED/ARCHIVED) using `GET /documents/stats`, or drop the endpoint + `documentsApi.stats`.
  Prefer rendering the cards (cheap, adds value).
- [ ] **Seed data:** add a small, honest set of tenant documents (one per status, with
  a real uploaded fixture) so the page is never empty on a fresh seed. Wire into
  `backend/prisma/seed.js` (multi-tenant for DEFAULT and SOLANA).
- [ ] **CommandPalette gating:** the `Documents` entry in `frontend/src/components/CommandPalette.jsx`
  is not role-gated even though the route is. Filter palette entries by role/capability
  like the Sidebar.
- [ ] **Stale benchmark docs:** update claims that "no document model exists":
  `src/docs/PRIME_HRM_EVIDENCE.md` L130/165/185, `src/docs/HRMS_BENCHMARK.md` L44/47/83,
  `PRIME_HRM_GAP.md` L25 — point them at `src/docs/DOCUMENTS.md`.
- [ ] **Delete test fixtures:** the dev DB holds ad-hoc DTMS test documents from earlier
  smoke tests (now archived). Leave a clean seed instead (see the seed item above).

## Shared foundation decisions (do once, use everywhere)
- Add a helper for "current tenant user" lookups used by M3/M6/M7 (assignee validation).
- Standardize a `sha256File(path)` utility for M2 (version checksum) and M7 (`evidenceHash`).
- Decide the storage root resolution once and reuse it (currently `process.cwd()/uploads`).

## Acceptance criteria
- [ ] `GET /documents/:id/download` works for both legacy (`/uploads/...`) and normalized (`uploads/...`) rows.
- [ ] Sizes render in human units; filters reset pagination.
- [ ] Fresh `node prisma/seed.js` produces non-empty Documents for both tenants.
- [ ] Verify gates pass (`npm run build`, `node --check`, color lint).
