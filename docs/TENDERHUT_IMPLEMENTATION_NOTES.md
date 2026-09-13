# Provider implementation handoff

TenderHut is the sole tender source. This is an undeployed prototype with fresh iterations and no compatibility guarantee. The latest cleanup removes independent notice/award imports and all prior catalogue ingestion/matching paths. Preserve private configuration.

## Current behavior

- `/`, signup and signin lead to discovery. Listing retrieval runs on navigation/reload/search; no focus listeners, scheduler, polling or automatic AI.
- Public JSON queries map keyword, state/category, organisation, originating portal, buyer group, procurement type, value, closing date, sorting and pagination. Displayed-page CSV export remains.
- Opened/saved/matched provider tenders are materialized under `th-<ID>`. Queries/observations have seven-day caches; source failure returns the same cached query with a stale warning or a clear availability error.
- HTML detail refresh validates canonical path and provider identity, merges supplied fields and retains internal observation provenance. Sparse responses do not erase richer facts. Raw provider data is not rendered in the product.
- Catalogue records have no private-owner variant or legacy identity field. Transactional versions retain source changes and reopen linked preparation tasks; private reviews become unconfirmed on a new version. Unchanged retrieval does not create another version.
- Company profile matching performs at most three searches, retrieves up to 150 metadata candidates and selects up to 30 by local profile-keyword relevance. It displays ten tender cards immediately with spinners in the explanation sections, then generates explanations for that loaded batch only. Scrolling fetches the next ten cards independently of earlier explanation requests. There is no whole-shortlist embedding/ranking pass. Failures preserve cards and allow explanation retry; successful model work is cached. Matching preferences and per-user relevance feedback now affect weighted metadata ranking; private PDF findings are not candidate sources.
- Tender PDFs may be uploaded only onto an existing tender; reusable company evidence and submission acknowledgments have a separate private file library. Upload text and AI findings remain private. Source citations use the canonical analysis document ID and page ordinal; no direct alternate-portal PDF fetching is offered.
- Chrome extension pairing and selected ZIP/PDF extraction remain. The app never receives upstream login credentials. The real signed-in Chrome download needs manual verification.

## Code map

| Area | Files |
| --- | --- |
| Public discovery/detail | `src/lib/tenderhut/{client,normalize,store}.ts` |
| Private matching runs | `src/lib/tenderhut/matching.ts`, `src/app/api/matching/route.ts` |
| Source versions/preparation | `src/lib/store.ts`, `src/app/api/data/route.ts` |
| Documents/extraction/evidence | `src/lib/ai/{documents,service,grounding,conflicts}.ts`, `src/app/api/ai/route.ts` |
| Attachment transfer | `src/lib/attachments/`, `src/app/api/attachments/`, `extension/` |
| Workspace UI | `src/components/` |
| Readiness/evidence/decisions | `src/lib/{readiness,workflow,workflow-schema}.ts`, `src/app/api/workflow/route.ts`, `src/components/workflow.tsx` |
| PDF retention/OCR/coverage | `src/lib/{files,ocr,document-pages}.ts`, `src/components/document-review.tsx`, `scripts/ocr-worker.mjs` |
| Monitoring/calendar | `src/lib/{monitor,calendar}.ts`, `scripts/monitor.ts`, `src/app/api/calendar/route.ts` |
| Setup | `scripts/manage.ts` (configuration/index checks only) |
| Live source smoke | `scripts/tenderhut-smoke.ts` (`--ai` makes a bounded live AI call) |

See [README](../README.md) for commands and limits and [verification](VERIFICATION.md) for actual test results. Extension packaging: `python3 scripts/package-extension.py` after extension changes.

## Limits to retain

Source fetches have a 12-second timeout, 4 MB response cap, at most two simultaneous requests per process and bounded backoff. Matching selection is heuristic, not exhaustive. Unspecified date timezones remain date-only in normalized fields. There is no official submission, awards feed, team assignment or push delivery. Local English OCR and optional scheduled reminders/email delivery are implemented; see FEATURE_WORKFLOWS.md. Transfer archives are temporary; selected review PDFs are retained privately for document viewing. No deployment or distributed concurrency guarantees are claimed.
