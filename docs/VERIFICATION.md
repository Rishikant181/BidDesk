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
