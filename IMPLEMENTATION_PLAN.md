# BidDesk — One-pass implementation plan

Date: 2026-09-11
Status: application implemented; local Atlas and browser verification completed. See the execution record below for source limitations.
Product scope: [PROPOSAL.md](./PROPOSAL.md).

## 1. Execution contract

Deliver one coherent, locally runnable application in a focused implementation run, with internal checkpoints and a final verification/rehearsal pass. This is not a promise of a working product from a single untested code generation.

Keep the agreed feature scope. Reduce complexity through shared components and services, not fake controls or silently omitted workflows. Do not deploy, purchase services, add monetization, or substitute fictional tenders. Automatic discovery is India-only in the initial POC. International manual imports remain possible; no international feed is planned.

Work sequentially unless the user explicitly requests delegation. Preserve existing user files and changes. Keep a short progress record in this document during implementation, including verified sources and unresolved limitations.

## 2. Current repository and prerequisites

- Repository now contains the Next.js application, scripts, real snapshot, tests, and handoff documentation.
- Planning environment has Node.js v24.18.0 and npm 11.16.0. Verify dependency compatibility when scaffolding and record the chosen Node version.
- Atlas connectivity, indexes, authentication, and persistence have been verified with the supplied local configuration.
- User supplies the Atlas URI through ignored `.env.local`, not chat or a committed file. Use a dedicated BidDesk database and a database user restricted to it.
- Configure local IP access in Atlas as needed. Do not silently broaden network access.
- Generate the authentication secret locally; never print it or database credentials in logs.
- Install dependencies and use official sources as needed under the tool permission model. Do not create external accounts or deploy as part of this run.

Proposed environment variables:

```dotenv
MONGODB_URI=<local-secret>
MONGODB_DB=biddesk
BETTER_AUTH_SECRET=<locally-generated-secret>
BETTER_AUTH_URL=http://localhost:3000
```

An unavailable Atlas configuration must produce a clear setup error. Continue schema, UI, import, and pure-function work while awaiting configuration, but do not claim persistence/integration acceptance without a successful connection. Do not introduce an undisclosed mock database fallback.

## 3. Fixed implementation choices

| Concern | Choice |
| --- | --- |
| Application | Next.js App Router, TypeScript, Node runtime for database/auth endpoints |
| Styling | Tailwind CSS, reusable accessible controls, Lucide icons; light theme initially |
| Database | Official MongoDB Node driver, shared bounded connection pool; no extra ORM |
| Authentication | Better Auth with MongoDB adapter and email/password sessions; no paid email provider |
| Validation | Zod schemas shared between import review, APIs, and domain services |
| Search | MongoDB text index plus structured filters, stable pagination and sorting |
| PDF | PDF.js in a browser worker; preserve page numbers and let users confirm fields |
| CSV | A maintained CSV parser; explicit column mapping and row validation |
| State | URL query parameters for discovery; server persistence for workspace data; small client state for transient controls |
| Testing | Vitest for important domain behavior; Playwright for core browser journeys |
| Dependencies | Install compatible stable versions, save a lockfile, record actual versions; avoid experimental features |

Use current library documentation when wiring exact imports. Better Auth adapter packaging can vary by version; verify against installed package exports rather than copying an incompatible snippet.

Implement password/session behavior through the library. Account recovery can be a documented local administrative process for this POC; do not show a broken email-reset flow. No OAuth setup is required.

## 4. Repository layout

```text
src/
  app/
    (auth)/sign-in/
    (auth)/sign-up/
    (workspace)/overview/
    (workspace)/discover/
    (workspace)/tenders/[id]/
    (workspace)/compare/
    (workspace)/bids/
    (workspace)/bids/[id]/
    (workspace)/calendar/
    (workspace)/results/
    (workspace)/company/
    (workspace)/imports/
    api/
  components/
    ui/
    tenders/
    bids/
    imports/
  lib/
    auth/
    db/
    schemas/
    domain/             # eligibility, changes, dates, deduplication
    services/           # server-only authorization and business operations
    ingestion/          # adapters and normalization
scripts/                # configuration check, indexes, import, refresh
data/
  public/               # verified normalized public metadata + source manifest
docs/
  DATA_SOURCES.md
  DEMO_WALKTHROUGH.md
tests/
  unit/
  integration/
  e2e/
```

Keep collected raw documents, user uploads, logs, `.env.local`, and private exports ignored unless a public artifact is explicitly appropriate to redistribute. Never put private data in a Next.js public directory.

## 5. Data contracts and ownership

Agree these contracts before building individual screens:

| Record | Important fields/invariants |
| --- | --- |
| Tender | Stable ID, source + reference + lot where present, title, description, authority, category, country/state/city, money values/currency, closing time + precision/timezone, status, source URL, latest version |
| Tender version | Immutable snapshot, content hash, observed time, source publication time when known, source references, previous-version link |
| Document | Tender/version link, title, URL or private owner, checksum, page text, extraction status; no large binary blobs |
| Company | Owner/workspace, categories, regions, dated financial facts, certifications, past work, evidence references |
| Requirement | Stable requirement key, version, type/operator/threshold/unit/period, clause/page, confirmation status, private owner for user interpretations |
| Assessment | Company revision + requirement revision, outcome, reasons, evidence links; stale when inputs change |
| Bid | Owner, tender/version, stage, bid/no-bid reason, timestamps |
| Task | Bid, owner, requirement key/version where applicable, due date, status, assignee label, evidence/notes |
| Favorite/note | Owner and tender/bid reference; private |
| Result | Tender/source link, actual award date/value/winner when published; nullable unknowns |
| Import run | Source/method, timestamps, imported/updated/skipped/rejected counts, errors |
| Notification | Owner, event key, read state; duplicate event protection |

Use one private workspace per account. Assignee labels support task responsibility without adding an invitation/role-management subsystem.

Server-side services derive ownership from the authenticated session, never a client-supplied user ID. Catalogue records are shared read-only to regular users. User-uploaded tenders and documents are private by default; importing a URL does not make private annotations public. Only the trusted local ingestion command publishes verified catalogue data.

Create unique keys for catalogue identity, owner+tender favorites, owner+tender bids, and source/version hashes. Index common location/category/deadline/status filters and owner/date queries. Validate sort fields and cap page/export sizes. Do not expose arbitrary MongoDB queries or user-supplied regex operators.

Money values retain currency; avoid comparing different currencies as if equivalent. Store missing values as null. A date-only deadline remains date-only/needs confirmation; never invent an exact submission hour. Preserve separate source status and date-derived closure.

## 6. Source feasibility and the real-data gate

Do this before building a large catalogue UI:

1. Probe CPPP/ePublishing and a small number of official institutional/department tender pages.
2. Inspect access conditions and actual HTML/document availability. Do not bypass login/CAPTCHA or treat search snippets as authoritative records.
3. Acquire a few real records through the intended import path, including source links, dates, and document references.
4. Validate normalization against originals. Record source support in `docs/DATA_SOURCES.md` as automated, manual, or unsupported.
5. Seek at least one genuine amendment pair and some published awards. Historical examples are acceptable when explicitly labelled closed/historical.
6. Expand toward 50–100 verified Indian records only after the initial path works. Prefer fewer trustworthy records to fabricated or unverified volume; report any target shortfall.

Bound the source feasibility work: do not spend the whole run building a nationwide crawler. If a candidate is blocked, record why and use another official source or manual import. The import-and-workspace product can be completed even if some automatic adapters remain unavailable.

A generic import pipeline accepts normalized JSON/CSV and user-reviewed document text. Source adapters plug into that same pipeline. Adapter operations have timeouts, bounded retries, conservative request rates, and explicit failure records.

Refresh never deletes a tender merely because it disappeared from a listing, never rewrites unchanged versions, and never marks a failed fetch as freshly verified. Re-importing an identical record must be harmless. Link source references conservatively; do not merge unrelated lots or re-tenders by title similarity alone.

Do not commit private or unlicensed document bodies. A dated manifest of public metadata, references, and checksums should make imports reviewable and repeatable.

## 7. Build order and internal completion gates

### A. Foundation and persistent first workflow

- Scaffold app, styles, validation, server-only environment handling, and pooled database access.
- Add database index/setup and connectivity-check commands.
- Integrate authentication and private workspace ownership checks.
- Ingest a few verified public records.
- Build discovery → tender detail → favorite → reload, backed by Atlas.

**Gate:** sign in, read a real record, favorite it, reload, and verify persistence; a second account cannot access private notes. This establishes real integration before UI breadth.

### B. Complete discovery and import

- Finish search/filter/sort/pagination, comparison (up to four tenders), document/source links, freshness, and public/private visibility.
- Add CSV template, preview, validation errors, deduplication report, and confirm/import.
- Add browser PDF extraction with page references, progress, cancellation, and extraction-failure state.
- Let users enter/confirm key tender fields and requirements. Candidate field suggestions are drafts only.
- Support manual entry and source-link attachment when extraction or URL retrieval is unsupported.

**Gate:** a real PDF and a CSV can each become a private persisted tender; invalid rows are explainable and successful imports are repeatable.

### C. Company, eligibility, and bid preparation

- Implement editable company profile/evidence facts.
- Support a small explicit rule set: numeric minimums with matching periods/units, certification presence/expiry, location constraints, and user-reviewed experience requirements.
- Route ambiguous/composite conditions to “needs review”; do not overgeneralize financial eligibility formulas.
- Assessment outcomes are appears satisfied, not satisfied, needs review. Missing evidence and incomplete extraction cannot yield an overall eligible claim.
- Add bid stages: shortlisted, reviewing, preparing, submitted, won, lost, no-bid.
- Generate linked tasks once from confirmed requirements; support edits, owner labels, due dates, notes, and completion.
- User-marked bid outcome is separate from an official published award.

**Gate:** changing company evidence changes the assessment, requirement tasks are not duplicated on retry, and bid activity persists.

### D. Versions and amendment impact

- Import a subsequent version explicitly linked to an existing tender.
- Show structured field differences and page/text changes.
- Reassess confirmed changed requirements and flag/reopen their linked tasks; preserve task notes and history.
- Treat wording-only or uncertain matches as pending review; do not infer semantic equivalence from text diff alone.
- Produce owner-scoped in-app notifications when watched tenders change.
- Use idempotent event keys and retry-safe operations; prevent partial retry from duplicating tasks/notifications.

**Gate:** replay a genuine version pair. Previous data remains accessible, only relevant linked tasks change, and repeating the import does not repeat effects. If no genuine pair is obtainable, test the logic with clearly isolated test fixtures and report the real-data rehearsal gap explicitly.

### E. Derived screens and presentation finish

- Build dashboard and calendar from the same persisted tenders, tasks, and bids; no separate invented dashboard dataset.
- Build searchable results and basic aggregations from actual imported awards. Show source coverage/sample sizes and sensible empty states.
- Add notifications/read state, CSV list export, and printable/exportable bid checklist.
- Finish keyboard interaction, responsive behavior, loading/error/empty states, and consistent formatting.

**Gate:** all navigation and visible actions work; displayed metrics reconcile to database records.

### F. Verify and hand off

- Run type checking, lint, unit/integration tests, production build, and the focused browser suite.
- Rehearse with current data and at least one separate test account.
- Check fresh installation/setup instructions, error handling without Atlas, and actual Atlas persistence.
- Document exact source coverage, limitations, setup, refresh, exports, and presentation steps.
- Stop adding features once these checks pass. Report unresolved failures honestly rather than claiming full acceptance.

## 8. UI decisions to avoid build-time ambiguity

- Desktop-first light interface: navy/neutral navigation, restrained teal primary actions, amber review states; statuses also use words/icons.
- Sidebar follows the proposal. Imports is a prominent action and an auxiliary page rather than an unrelated product module.
- Search uses a compact table with quick preview and persistent URL filters; preserve selection through preview navigation.
- Tender detail tabs: Overview, Eligibility, Documents, Changes. A primary action opens/creates its bid workspace.
- My Bids uses a simple board/list and accessible stage selector; drag-and-drop is optional, not a completion dependency.
- Calendar provides a month view and agenda list. No external calendar service is required.
- Build polished data presentation with existing UI primitives; no image-generation, marketing site, dark-mode system, or custom illustration work is needed.

## 9. Verification matrix

| Area | Meaningful checks |
| --- | --- |
| Authorization | Two-user isolation on reads, writes, imports, exports, and document text; logged-out writes rejected |
| Real data | Source/reference preserved, values/dates checked, historical status truthful, missing amounts not zero |
| Ingestion | Duplicate import safe; partial failures reported; failed refresh retains old data and freshness timestamp |
| Eligibility | Exact threshold, absent evidence, expired certificate, different period/unit, unconfirmed clause, changed profile |
| Versions | Immutable old version; same-content retry no-op; deadline extension reflected; related tasks reopened once |
| UI journey | Sign in → search/filter → favorite/compare → eligibility → bid/tasks → calendar → reload/export |
| Imports | Real text PDF, scanned/no-text PDF, malformed CSV, duplicate rows, oversized extracted content |
| Exports | Correct scope/filters and spreadsheet formula escaping |
| Build | Typecheck, lint, production build, no runtime secret exposure or private data in static assets |

Test fixtures may use synthetic inputs for edge cases but must never seed the public/demo tender catalogue. Use an isolated test database and only clean up records created by tests. Do not reset the user's real Atlas database or preparation work.

Avoid uncontrolled server-side URL fetching. Restrict automated fetches to supported source adapters; validate URL schemes and redirect targets. Store extracted text as text, not trusted HTML. Keep exact upload/text limits explicit in the UI and aligned with hosted request limits.

## 10. Planned commands and deliverables

Expose these command names or document their final equivalents:

```text
npm run dev
npm run check:config
npm run db:indexes
npm run data:import -- --file <path>
npm run data:refresh -- --source <supported-source>
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run start
```

Deliver application code and lockfile; `.env.example`; README setup instructions; source manifest and verified public metadata; import templates; tests; `docs/DATA_SOURCES.md`; `docs/DEMO_WALKTHROUGH.md`; and updated progress/limitations.

## 11. Completion boundaries

Do not expand into deployment, global feeds, paid AI, automated submission, object storage, messaging, or enterprise administration. Do not drop required persistence, import review, or source provenance to save time.

If external access blocks one portion, continue independent work and clearly distinguish implemented, tested, and externally blocked functionality. Atlas availability and verified source coverage are dependencies, not facts to assume away.

## 12. Execution handoff

Suggested instruction for the implementation turn:

> Implement BidDesk in this repository according to PROPOSAL.md and IMPLEMENTATION_PLAN.md. Complete the implementation and verification in one focused run, making routine implementation decisions autonomously. Use real Indian tender data and Atlas persistence, keep paid services and deployment out of scope, and preserve source provenance and private workspace isolation. Check configuration and source feasibility early. Use imports when automated source access is unavailable; never substitute fake catalogue data. Finish with setup instructions, verified coverage, test results, and a repeatable demo walkthrough. Report external blockers and unverified behavior explicitly.

The execution brief above was subsequently authorized and implemented.

## 13. Documentation checked while planning

- Next.js authentication: https://nextjs.org/docs/app/guides/authentication
- Better Auth MongoDB adapter: https://better-auth.com/docs/adapters/mongo
- Better Auth Next.js integration: https://better-auth.com/docs/integrations/next
- MongoDB connection pooling: https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/
- PDF.js: https://mozilla.github.io/pdf.js/getting_started/

These references support the selected integration approach. Package versions, Atlas connectivity, and source adapters still require verification during implementation.

## Progress

- [x] Product proposal reviewed and repository inspected.
- [x] One-pass implementation plan saved.
- [x] Configuration/source feasibility checked.
- [x] Foundation and persistent workflow implemented.
- [x] Discovery/import complete.
- [x] Eligibility and preparation complete.
- [x] Amendment impact implemented and tested with isolated fixtures; genuine published pair unavailable.
- [x] Derived screens and presentation polish complete.
- [x] Verification and handoff complete; see README and source/demo documentation.

## Execution record — 11 September 2026

- The user selected a **one-time real snapshot** after discussing ongoing feeds and public APIs. No scheduled collection or API integration is enabled. `docs/TENDER_API_RESEARCH.md` is reference material only.
- Built Next.js 16.3.4 / React 19.3.0 / TypeScript 6.0.3 with Better Auth 1.7.4, MongoDB driver 7.6.0, PDF.js 6.3.289, Zod 4.6.2, and Tailwind 4.3.3. The lockfile records exact packages. Runtime verified on Node 24.18.0.
- Verified the supplied Atlas configuration and imported **77 real ISRO notices**. Two notices were enriched against original PDFs; the second demo import reported 2 updated, 75 unchanged, 0 rejected. Missing amounts and reference-based titles remain explicit on other records.
- Shared catalogue, private accounts/imports/reviews, discovery/filter/export/compare, company evidence, eligibility review, bids/tasks, calendar, notifications, PDF/CSV import, and award import/search are implemented.
- Imports, immutable versions and amendment effects use Atlas transactions. Same-content retries do not duplicate versions/tasks/notifications. Content reversion retains intermediate history. Bid saves reject stale revisions.
- Browser tests use a new randomly named Atlas test database and remove that database at the end. Test-only tenders/accounts/awards are not placed in the demo database.
- Production build uses the supported `next build --webpack` option after Turbopack encountered a build-environment socket restriction. TypeScript, ESLint, and 24 unit checks passed. The development browser suite passed, including the actual PRL PDF extraction/import. Final production browser results are in `docs/VERIFICATION.md`.
- No genuine official amendment pair or verified award dataset is preloaded. The corresponding workflows are implemented; amendment behavior is rehearsed using isolated fixtures. Metadata enrichment is labelled as enrichment, not an official corrigendum.
- Architectural simplifications: one catch-all workspace route with a fixed route allowlist; small shared component modules; no persisted assessment cache (assessments recalculate from current inputs); local PDF originals plus persisted text; capped small-catalogue reads. See README for limits, including large version-response pagination needed before hosted use at scale.
- No deployment, payment setup, paid inference service, nationwide crawler, or international feed was introduced.

Handoff: [README.md](README.md), [DATA_SOURCES.md](docs/DATA_SOURCES.md), [DEMO_WALKTHROUGH.md](docs/DEMO_WALKTHROUGH.md), and [VERIFICATION.md](docs/VERIFICATION.md).
