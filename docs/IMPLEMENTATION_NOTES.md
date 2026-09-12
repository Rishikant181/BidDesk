# Implementation notes for the next session

## Latest planning decision — TenderHut (not implemented)

Read [TENDERHUT_INTEGRATION_PROPOSAL.md](TENDERHUT_INTEGRATION_PROPOSAL.md) before planning or implementing the next increment. It supersedes the snapshot-only direction below for future work: public TenderHut discovery with immediate default results, explicit company-profile searches followed by AI matching, and source retrieval on page refresh/navigation or opening details. **No periodic polling or manual refresh control.** MongoDB retains cached/saved records and history; PDF upload/analysis remains optional with official tender links primary. The user explicitly paused implementation and requested documentation only. No integration code has been written; wait for an implementation request. The sections below describe the existing snapshot/Gemini implementation, not this proposed integration.

Last updated: 12 September 2026. The snapshot POC is implemented. The subsequent three-feature Gemini increment is now implemented locally; live Gemini smoke checks now pass after configuring the key and fixing model/schema compatibility.

## Latest increment — Gemini

Read [GEMINI_IMPLEMENTATION_NOTES.md](GEMINI_IMPLEMENTATION_NOTES.md) before continuing AI work. It records the implementation, real source preparation, commands, tests, remaining limits and resume steps. [GEMINI_IMPLEMENTATION_PLAN.md](GEMINI_IMPLEMENTATION_PLAN.md) is the accepted design, not a claim that every live quality gate has passed.

Implemented: official linked PDF retrieval with local-upload fallback; sourced structured drafts and private findings; selected company/project evidence; conservative AI-assisted eligibility plus separate human judgments; semantic matching over real reviewed scopes; cache, concurrency and daily allowances; operator preparation and isolated browser tests. Nine official PDFs were retrieved and reviewed; their scope artifact is in `data/public/isro-matching-scopes.json` and matching profiles are in Atlas. The 77-record snapshot was not refreshed.

`GEMINI_API_KEY` is now configured. Live checks pass with `gemini-3.6-flash` and `gemini-embedding-2`. The initially chosen 2.5 Flash appeared in model lookup but rejected token-count requests for new users. Generation now uses a simplified provider schema while Zod enforces all original bounds locally. Preserve `.env.local`; see the Gemini notes for the exact scope of live verification. The user confirmed Gemini free tier: use only public or non-sensitive demo inputs. Test stubs are restricted to fresh random test databases and cannot serve the real demo.

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
- Conservative eligibility rules plus optional Gemini suggestions with explicit source/evidence review. The later AI request supersedes the original no-LLM implementation scope.

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
- No email recovery/verification provider, enterprise invitations/roles, official submission, notifications delivery, or monetization.
- No deployment/load test/exhaustive accessibility or scanned/encrypted-PDF corpus test. Recheck hosting limits and use eligibility if deployment is requested later.
- The user authorized committing and pushing the completed implementation and notes. Check the local branch and upstream status when resuming; do not assume later changes are already backed up.

Use `docs/DEMO_WALKTHROUGH.md` for the presentation sequence. Update this note after meaningful follow-up work so the next session has a trustworthy continuation point.


## Read document fix

The user reported failures on almost all linked PDFs. Reproduced in a real development browser request: 735,583 downloaded bytes arrived in the PDF worker as a plain numeric-key object, so `new Uint8Array(workerData)` produced zero bytes. Use the explicit `{pdfBase64}` envelope in `documents.ts` / `pdf-extract-worker.mjs`; do not revert to a naked typed-array payload. Both sides retain size limits. Known document errors now use safe `AiError` messages instead of the generic database/source failure. New `document-read.spec.ts` exercises a real linked official PRL PDF and cached repeat read, without any Gemini call. Unit suite now has 48 passing tests, including actual PDF-worker extraction and empty-input rejection.

## Citation identity fix

The user next reported all fields rejected as unsupported citations. Atlas comparison proved the quoted words matched, but every citation used the document's Mongo `_id` instead of its canonical `id`. The extraction prompt previously spread the entire database record, exposing both. `extractionInput` in `grounding.ts` now explicitly sends only canonical document ID, name, selected pages, coverage and the ID rule; both the app and live CLI use it. Exact quote/page/ID validation remains strict. A regression test ensures database/owner metadata cannot leak into this model input.

Re-ran the user's two affected public official-PDF drafts through the real `extractChunk` service (two bounded Gemini calls). PRL RFSoC and ISTRAC GNSS drafts each retained five fields, with no unsupported citations. Saved drafts only; no shared metadata or confirmed private findings were applied. PRL still rejected an invalid closesAt suggestion; this separate warning requires source review. Reload the tender and open the updated draft rather than spending another call. Unit suite: 49 pass; lint/typecheck pass.

## Source comparison fix

GNSS findings exposed false conflicts from literal string comparison. `ai/conflicts.ts` now recognizes the two explicit ISTRAC PUBLIC TENDER NOTICE / PURCHASE formats only when the complete TR identifier matches. Date-only vs timestamp suggestions on the same stated date are precision differences, and equivalent fully specified instants are equal; genuine changed dates/times/references remain conflicts. The original precise snapshot deadline is never replaced. Numeric formatting differences are also normalized for amount comparison.

`applyDraft`, saved-state loading, eligibility and matching publication share this comparison. Existing saved findings are reconciled on read without rewriting source records or auto-confirming requirements. UI shows comparison notes. Verified the user's existing GNSS findings now have zero conflicts and retain `2026-09-29T02:00:00+05:30`; no Gemini call was needed. Unit suite: 50 pass, including distinct tender IDs/dates/times and equivalent time zones; lint/typecheck pass.
