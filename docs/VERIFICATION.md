# Verification — 11 September 2026

## Passed

| Check | Result |
| --- | --- |
| Atlas configuration and connection | Connected successfully; credentials never printed |
| Shared real snapshot | 77 records; second import: 2 PDF-enriched updates, 75 unchanged, 0 rejected |
| Snapshot integrity | SHA-256 matches committed manifest |
| TypeScript | `npm run typecheck` passed |
| ESLint | `npm run lint` passed |
| Domain tests | 24 tests passed with `npm test` |
| Production build | `npm run build` passed using Next.js Webpack |
| Development browser rehearsal | 2 tests passed, 48.6 seconds |
| Final production browser rehearsal | 2 tests passed, 44.6 seconds, including real source PDF |
| Browser asset secret scan | 30 built assets checked; configured Atlas URI and auth secret absent |
| Test cleanup | Temporary test databases removed by guarded teardown; demo database unchanged by tests |

The browser tests are long end-to-end journeys, not two isolated button checks. They exercise:

- Signup/login/logout and logged-out API rejection.
- Real snapshot listing/search, favorites across reload, comparison, and scoped CSV export.
- CSV mapping/validation with an invalid monetary row and a successful private import.
- Identical import deduplication, evidenced eligibility assessment, bid creation, task notes/completion persistence.
- An imported requirement change reopening a task while retaining evidence; unchanged retry; content reversion preserving three versions; stale bid revision rejection.
- Two-user denial of private tender/document/version access, private amendment writes and private export contents.
- Notification creation/deduplication and mark-read persistence.
- Award import and company-profile save through the browser.
- Calendar/results navigation, loaded mobile overview, no mobile horizontal overflow, and no uncaught page errors during the main journey.
- Browser PDF worker extraction of the real PRL PT-18 PDF, user review/import, and persisted document text.

Unit tests cover exact/missing financial evidence, mismatched financial periods/currencies, certificate expiry through deadline, unconfirmed requirements, IST date-only closure, source-status precedence, affected-task selection, canonical change detection, spreadsheet formula escaping, malformed URLs/dates, invalid money/duplicate requirement IDs, and source-parser structure/provenance.

## Reproduce the final browser run

```sh
npm run build
BIDDESK_E2E_PRODUCTION=1 BIDDESK_TEST_PDF=/absolute/path/to/NIT_PT_18_07092026.pdf npm run test:e2e
```

Obtain the PDF from the original source linked in DATA_SOURCES.md. It is not bundled into the repository. Without `BIDDESK_TEST_PDF`, the source-PDF test is skipped explicitly. Screenshots/traces and the test database cleanup marker are ignored under `.local` / `test-results`.

## Limits of this verification

No deployment, high-volume load test, exhaustive accessibility audit, or complete scanned/encrypted-PDF corpus test was performed. Large version histories and workspace payloads need pagination before hosted use at scale. No genuine official amendment pair or award dataset was preloaded; those test inputs are isolated, labelled fixtures. The shared catalogue is real source metadata, not a freshness guarantee or nationwide coverage claim.

Turbopack production builds failed because their CSS subprocess could not bind a local socket in the execution environment. The supported Webpack production path compiled and passed the full browser rehearsal. The first sandboxed Webpack attempt also failed to capture a TypeScript subprocess; the authorized build outside that restriction succeeded without disabling type checks.

## Gemini increment — 12 September 2026

- TypeScript, ESLint, `git diff --check`: pass. Unit suite: **45 passed**.
- Production Webpack build: pass, including `/api/ai` and traced PDF worker.
- Existing production snapshot/private import/amendment workflow and official PRL PDF browser extraction: pass (20.9s and 3.5s).
- Final AI production browser rerun: **2 passed in 50.0s**. Covers consent, sourced draft application, private eligibility, human evidence judgments, stale judgments/results, semantic recommendations, shared-record preservation, tenant isolation, repeated requests, atomic concurrent deduplication and quota rejection. An earlier failure was a test selector matching hidden per-requirement inputs; the selector was corrected. No application behavior was bypassed.
- Desktop and mobile AI recommendation screenshots inspected; mobile has no horizontal overflow. Screenshots use clearly labelled fixtures in the isolated test database, not demo catalogue records.
- Actual official PDF fetch/extraction: 9 successful documents out of 10 attempted; one timed out and was skipped. Nine reviewed scopes published and idempotently restored from `data/public/isro-matching-scopes.json`.
- Configured secret values found in generated browser assets: **0**.
- **Live Gemini verification pending**: no `GEMINI_API_KEY` in `.env.local`. Provider-model access, response quality, true token usage and ranking quality were not established by deterministic tests. See `docs/GEMINI_IMPLEMENTATION_NOTES.md` for the live check sequence and remaining evaluation limits.


### Live Gemini follow-up

The user subsequently added the key. `test:ai:live` now passes against real Gemini 3.6 Flash and Gemini Embedding 2: six grounded items, source-citation validation, a nonempty conservative cited eligibility response, correct laboratory/civil ordering and a nonempty grounded explanation. Invalid dates and an unsupported requirement were discarded, so completeness/accuracy remains a review task. See the Gemini notes for the model migration, provider-schema correction and test limitations. Unit suite now has 46 passing tests. Earlier “pending key” entries above describe the initial implementation stage.

### Linked PDF Read document regression

Reproduced a web-runtime worker payload bug: the 735,583-byte official PRL PDF arrived as a numeric-key object, and the worker converted it to empty bytes. Corrected transport to a size-checked base64 envelope and exposed safe, specific document errors. New browser test downloads and reads the official PDF, verifies RFSoC source text, and checks cached repeat identity. Development: 1 passed (34.1s); production: 1 passed (28.8s). Production build, TypeScript, ESLint, diff checks and 48 unit tests pass. No Gemini calls were made for this fix. User confirmed free-tier/public-or-non-sensitive-only inputs; continuity notes record that preference.

### Citation identity regression

Diagnosed the user's all-fields-rejected drafts against actual saved source pages: quote text matched, but citations referenced Mongo `_id`. Fixed model input to expose only canonical `id` and selected document data. Real app-service rechecks of both affected public PDFs retained five fields each without unsupported-citation warnings; the separate invalid PRL deadline remained rejected. No findings were confirmed automatically. TypeScript, lint and 49 unit tests pass, including the ID/metadata regression.

### Source comparison regression

Corrected false conflicts for the GNSS notice: same complete ISTRAC TR identifier in two explicit reference formats, and same calendar date at different precision. Live read-only verification of the saved findings returned no conflicts, two explanatory notes, and the unchanged snapshot deadline `2026-09-29T02:00:00+05:30`. Tests ensure different identifiers, dates and explicit times still conflict, while equivalent time zones compare equal. Typecheck, lint and 50 unit tests pass. No Gemini calls or source-data mutations.
