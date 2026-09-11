# Implementation notes for the next session

Last updated: 11 September 2026. The user reviewed the app, said it looks good, and requested these continuity notes. The implementation is complete for the agreed snapshot POC; there is no unfinished feature currently assigned.

## Start here

1. Read this note, then `README.md`. Use `docs/DATA_SOURCES.md` for provenance and `docs/VERIFICATION.md` for the actual verification record.
2. Inspect `git status` before editing. The implementation was developed on `dev` after planning commit `90fa458`. The user subsequently requested committing and pushing the implementation and these notes. Use `git log -1` and `git status` to establish the current commit and any newer local changes; preserve those changes.
3. Preserve `.env.local` and existing Atlas data. Configuration and the demo import were verified in the implementation session. Do not print secrets, copy them into docs, overwrite the environment file, or reset the database.
4. Resume from the user's next request. Do not restart implementation, re-research APIs, re-import the snapshot, or expand into deployment without a reason.

Repository: `/var/home/rishikant/Desktop/Boxes/Personal/Repositories/BidDesk`. This is the user's BidDesk checkout, referred to earlier as `~/Repositories/BidDesk`.

## Accepted product decisions

- A usable TenderDetail-inspired demo, with improved preparation workflows; exact visual parity is unnecessary.
- Local operation with MongoDB Atlas Free; target no additional paid infrastructure/API services. No monetization or deployment in the current scope.
- **One-time snapshot of real Indian notices.** The user considered freshness, scraping and documented public APIs, then explicitly chose to continue with the snapshot plan. API research is archived in `docs/TENDER_API_RESEARCH.md`; no such integration is active.
- No invented public tender, award, price, or amendment records. Unknown data must remain unknown. Imported timestamps do not establish current source availability.
- One private workspace per authenticated account, with a shared read-only catalogue and private imports/reviews/preparation.
- Explicit eligibility rules with source/evidence review; no paid LLM or automatic interpretation of arbitrary tender documents.

## Implemented workflows

| Area | Current behavior |
| --- | --- |
| Authentication/setup | Better Auth email/password sessions, signup/signin/signout, configuration screen and connection errors; no mock database fallback |
| Overview | Counts, opportunities matched by declared regions/category keywords, outstanding tasks and snapshot information derived from persisted data |
| Discovery | Keyword search, state/category/authority/value/date/status filters, sorting, pagination, quick preview, favorites and CSV export |
| Comparison | Up to four tenders, financial and source/date fields, available requirements assessed against the user's company |
| Tender detail | Scope, source links, dates/unknown amounts, private notes, eligibility editor, document links/text and version differences |
| Company/eligibility | Company facts and evidence, simple matching-period INR turnover checks, certification evidence/expiry, declared regions and manual experience review; conservative outcomes |
| Bid preparation | Pipeline stages, bid/no-bid reason, linked requirement tasks, notes/evidence, responsibility labels, internal deadlines, completion and checklist CSV export |
| Imports | Reviewed manual entry, CSV mapping/row validation and browser PDF extraction; imports private by default; explicit private amendment import |
| Version impact | Prior snapshots retained; imported changes flag/reopen affected linked tasks and create private notifications; unchanged retries do not repeat effects; reverting content retains intervening versions |
| Calendar/notifications | Saved tender windows and outstanding task dates, in-app imported-change notifications and mark-read action |
| Results | Private official-award entry, search and basic coverage/supplier/value counts; no award dataset preloaded |

The UI uses a light content area, dark teal sidebar, responsive navigation, tables, native modal dialogs and explicit loading/empty/error states. Desktop and loaded mobile overview were inspected. No generated artwork or external font service is required.

## Real data already loaded

- **77 ISRO advertisement records**, register retrieval `2026-09-11T11:16:29.140Z`.
- `data/public/isro-tenders.json` contains the real normalized snapshot; `manifest.json` contains attribution and a SHA-256 of the complete JSON file.
- Two records were checked against original PDFs and enriched:
  - Search **5154**: SAC lab partition work, INR 427,000 estimated value, INR 8,540 EMD, submission published as 25 September 2026 at 17:00 IST. Experience conditions are composite and require manual review.
  - Search **RFSoC**: PRL board supply, GeM reference `GEM/2026/B/7990985`, due 1 October 2026 at 11:00 IST; advertisement does not publish price/full eligibility.
- The other 75 records largely retain reference-based titles, Unclassified categories, null financial values and advertised listing windows. Locations may represent the advertiser's office rather than the work site; source notes explain this.
- Initial Atlas import inserted 77 records. Enrichment import reported 2 updated, 75 unchanged, 0 rejected. Those two extra versions in the existing database are metadata improvements, **not official corrigenda**. A fresh import of the final file has one version per record.
- There is no verified genuine amendment pair or preloaded award dataset. Tests use clearly isolated fixtures for those mechanisms. Never present those fixtures as real procurements.
- `data:collect` and `data:refresh -- --source isro` are optional local maintenance tools, not scheduled jobs. Listing-only refresh may replace richer PDF-verified fields. Do not run these routinely or during the prepared demo.

## Code map and implementation details

| Files | Responsibility |
| --- | --- |
| `src/app/[...path]/page.tsx` | Authenticated workspace route with fixed route allowlist |
| `src/app/api/data/route.ts` | Session-scoped reads/mutations, search/export and validation; private responses use no-store caching |
| `src/app/api/auth/[...all]/route.ts`, `src/lib/auth*.ts` | Better Auth and browser auth client |
| `src/lib/db.ts` | Lazy pooled MongoDB client, configuration gate and indexes |
| `src/lib/schemas.ts` | Shared Zod contracts, URL/date validation and payload limits |
| `src/lib/domain.ts` | Eligibility, IST formatting/status, canonical differences, task impact and spreadsheet escaping |
| `src/lib/store.ts` | Visibility checks, tender import/version transactions, task/notification effects and bid creation |
| `src/lib/ingestion.ts` | ISRO register parser and explicit source fetch |
| `src/components/*` | Workspace shell, discovery/compare, detail/review, imports, bids and derived views |
| `scripts/manage.ts`, `scripts/collect.ts` | Configuration/index/import/maintenance commands |
| `scripts/pdf-worker.mjs` | Copies installed PDF.js worker to ignored `public/pdf.worker.min.mjs` before dev/build |
| `tests/unit`, `tests/e2e` | Domain tests and combined browser/Atlas integration journeys |

Ownership comes from the session, not client-supplied IDs. Public records use `ownerId: null`; imported records/reviews/bids belong to the user. Tender identity is owner + source + reference. Include lot identity in the reference for separate lots. Imports and version impacts use Atlas transactions. Version identity includes the predecessor so A → B → A is retained. Bid edits use revision checks. Assessments recalculate from current company/requirement inputs; stale private reviews become unconfirmed.

Stack at verification: Node 24.18.0, npm 11.16.0, Next.js 16.3.4, React 19.3.0, TypeScript 6.0.3, Better Auth 1.7.4, MongoDB driver 7.6.0, PDF.js 6.3.289, Zod 4.6.2, Tailwind 4.3.3. Use the lockfile; do not perform incidental dependency upgrades. Read relevant installed Next.js guides before framework changes, as required by AGENTS.md.

## Run and verify

The last session left a dev server on `http://localhost:3000`, but that process is not guaranteed to survive into another session. Check before starting another server.

```sh
npm run check:config
npm run dev
```

Use `localhost` consistently with `BETTER_AUTH_URL`. The existing `.env.local` contains the Atlas URI/database, generated auth secret and local auth URL. Do not replace it with `.env.example`. The snapshot is already loaded; import only if using an empty database or deliberately updating data.

Verification completed during implementation:

- TypeScript and ESLint passed; 24 unit tests passed.
- Production build passed with `npm run build` (`next build --webpack`). Turbopack production CSS processing encountered an environment socket restriction; retain the working Webpack choice unless deliberately revisiting it. No type checks were disabled.
- Development browser suite: 2 journey tests passed in 48.6 seconds.
- Production browser suite: 2 journey tests passed in 44.6 seconds, including actual PRL PDF extraction/import, private workspace isolation, deduplication, task impact, content reversion, stale writes, company save, award import and mobile layout.
- Snapshot checksum verified; configured secrets absent from 30 built browser assets.
- Temporary Atlas test databases were cleaned up. Demo data was not reset by tests.

```sh
npm run typecheck
npm run lint
npm test
npm run build
BIDDESK_E2E_PRODUCTION=1 BIDDESK_TEST_PDF=/absolute/path/notice.pdf npm run test:e2e
```

Browser tests start their own server on port 3001. They create a random `biddesk_test_<hex>` database and delete only that run's database via guarded teardown. Credentials need access to a separate test database; do not redirect tests at the demo database. Avoid concurrent test runs. An interrupted run leaves its database name in ignored `.local/e2e-database.json` for cleanup.

The source-PDF test is explicitly skipped without `BIDDESK_TEST_PDF`. The previous local file was `/tmp/biddesk-prl18.pdf`; it is ephemeral, not a repository dependency. Obtain the official PDF via the link in DATA_SOURCES.md if needed. Browser installation may require `npx playwright install chromium`. Network/socket restrictions in the agent environment required authorized execution outside the sandbox for browser tests and builds.

## Known limits and possible follow-up work

These are limitations or candidates for a later request, not a currently authorized expansion:

- Snapshot coverage and metadata depth: improve real source descriptions or add verified notices/awards/amendments if requested; no guaranteed freshness or nationwide/global feed.
- No OCR or stored/synced private PDF binaries. File limit 20 MB; 250 pages, 25,000 characters/page, 700,000/document. Manual review remains necessary.
- CSV batches up to 100 rows, 2 MB API body limit. Large text imports may need smaller batches.
- Small-catalogue read caps: 2,000 discovery/export/workspace tenders, 200 bids, 500 awards, 50 notifications and 50 full versions on detail. Large version/document responses need pagination before hosted use at scale.
- No email recovery/verification provider, enterprise invitations/roles, official submission, paid AI, notifications delivery, or monetization.
- No deployment/load test/exhaustive accessibility or scanned/encrypted-PDF corpus test. Recheck hosting limits and use eligibility if deployment is requested later.
- The user authorized committing and pushing the completed implementation and notes. Check the local branch and upstream status when resuming; do not assume later changes are already backed up.

Use `docs/DEMO_WALKTHROUGH.md` for the presentation sequence. Update this note after meaningful follow-up work so the next session has a trustworthy continuation point.
