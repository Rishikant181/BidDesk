# Verification — cards before explanations

- TypeScript, ESLint, 50 unit tests, production build and all seven browser journeys pass (browser suite: 1.6 minutes).
- A held explanation request proves ten cards and ten spinners render before generation. Initial matching makes no embedding requests; the API rejects explanations for unloaded pages.
- Pagination verifies 10 → 20 → 25 visible cards, pending/error states, cached explanation retry after a partial model failure, duplicate suppression, owner isolation, reload persistence and region staleness.
- A separate overlap test loads and explains cards 11–20 while explanations for 1–10 are held, then releases the first response and verifies all twenty cards/explanations survive with no request for the third page.
- Existing one-click entry, AI review, source discovery and workspace journeys remain green. Isolated source/model fixtures only; no live AI calls.

# Verification — one-click matching entry

- TypeScript, ESLint, 50 unit tests and production build pass.
- Five existing browser journeys passed, including ten-result scrolling and retry. The new entry-link test passed in 16.6 seconds after adding a URL wait before its back-navigation assertion (19.3 seconds with setup/teardown).
- The entry regression covers incomplete profiles, discovery and overview links starting exactly once, new run IDs despite existing results, reload/back persistence, and the in-panel new-search button.
- Fresh isolated database, source fixtures and model stubs; no live AI calls.

# Verification — explained matching pages

The matching iteration uses a stable ranked shortlist, publishes ten explained results per page and loads subsequent pages on scroll. Source retrieval/preparation remains bounded to 150 retrieved / 30 shortlisted notices.

- TypeScript, ESLint, 50 unit tests and the production Webpack build pass.
- New unit coverage requires exactly one grounded explanation per requested tender, rejects missing/duplicate/foreign/unsupported output, checks provider schema conversion, hides unrequested candidate/model input data, and invalidates results when regions change.
- Four existing production browser journeys passed with the new API. The pagination test correctly encountered the injected quota error but initially used an ambiguous alert selector that also matched Next.js's route announcer; the selector was narrowed to the matching panel.
- The pagination test covers 10 → 20 → 25 results, every card explained, automatic scrolling, failure halfway through a batch without publishing partial cards, cached retry, repeated-page idempotency, end-of-list behavior, reload persistence, owner isolation and profile-region staleness. The corrected test passed in 43.7 seconds (46.9 seconds including setup/teardown). All five browser journeys are verified: the four existing journeys in the full run and the corrected pagination journey in its targeted rerun.
- Tests use fresh isolated databases and model/source fixtures. No live Gemini calls or workspace-data changes were made for this increment. Earlier run formats are not resumed; start a new search.

# Verification — sole-source cleanup, 12 September 2026

## Completed checks

- TypeScript and ESLint pass.
- Unit suite: 47 passing tests across five files. Retired source-parser/downloader cases were removed; PDF byte extraction, citation identity, source normalization, domain checks, ZIP validation and extension boundaries remain covered.
- Production Webpack build passes, including its TypeScript check. The sandbox build could not launch the configuration subprocess successfully; the approved build outside the sandbox passed.
- Whitespace/diff checks pass.

## Browser coverage

Production browser tests use a new, empty random test database and deterministic provider/AI fixtures. No snapshot seed, public source call, live model call or external PDF fixture is required.

The suite covers:

- Removed page routes return 404; removed import/award/download/catalogue-matching actions are rejected; document text cannot be attached without a tender/version.
- Provider discovery, navigation freshness, cached source outages, saving and matching.
- Comparing provider tenders and uploading actual PDF bytes in the browser.
- Private requirements, bid tasks, deadlines, calendar, source versions and notification effects, and account isolation.
- AI extraction/application, grounded eligibility, human judgments, stale evidence, cache reuse, concurrency and allowance handling.
- Extension pairing, real ZIP/PDF extraction, grant replay rejection and attachment isolation.

The first browser run passed both AI tests and exposed stale notification-dialog state after source refresh, plus a test assumption about a shared fixture being absent. Tender detail now refreshes workspace state after source retrieval, and the fixture assertion now verifies a new upstream search. The corrected full production suite passed **4/4 tests in 56.1 seconds**, with no skipped cases. Screenshot review then identified and corrected a sidebar selector regression from removing the import link; the final production build and affected browser journey then passed (1/1, 22.0 seconds). Desktop and mobile screenshots were inspected and the sidebar layout is correct.

## Development database cleanup

An explicit one-time cleanup (not an application migration) removed 77 non-provider tenders and their dependent records: 79 versions, two source-change events, one review, three analysis documents, two drafts and one set of findings. It dropped retired award/import-run/catalogue-profile/catalogue-match/catalogue-document collections and removed obsolete legacy indexes. The 32 provider tenders, account/company data and provider preparation records were preserved. Non-provider tender count after cleanup: zero.

Automatic approval review rejected an initial broader cleanup that also cleared all AI caches and modified provider records. Those operations were removed; the narrower legacy-only cleanup was approved and completed. Shared AI caches and provider documents/fields were not purged. Old derived cache entries have no retired endpoint/UI consumer; no compatibility code was added for them.

The obsolete committed source snapshot artifacts and local catalogue review/recheck scratch files were removed. Credentials were not changed. Dependencies and lockfile removed only the unused CSV parser and its types; no dependency upgrades were made.

## Limits

No new live-provider or paid-model quality smoke check was needed for these removals. Tests use deterministic fixtures and do not establish live provider uptime. The real signed-in Firefox upstream attachment download still requires a manual check. No deployment, commit or push was performed. Other conditional issues in the earlier UI audit remain follow-up work unless marked resolved there.

## Integrated feature improvements — 13 September 2026

Final checks: `npm run typecheck`, `npm run lint`, all **66 unit tests**, `npm run build`, and `BIDDESK_E2E_PRODUCTION=1 npm run test:e2e` pass. The final production browser run passed **12/12 journeys in 2.6 minutes**.

Added coverage verifies readiness with unknown coverage/optional gaps, multiple-period financial evidence, missing/expired/stale evidence, task deduplication and reopening, private file authorization/deletion, PDF citation rendering, local OCR on text-rendered and raster-only table/number samples, saved search restoration, independent human judgments, stale decision snapshots, record/checklist edit preservation, 35-page analysis interruption/resume, calendar date precision, and reminder/sink deduplication/cancellation. Matching retains progressive ten-card behavior and passes a small labeled synthetic comparison against the prior keyword baseline.

All source and AI responses were fixtures. OCR ran locally using bundled English language data. Reminder email composition wrote only to the local sink. Each browser run used a fresh random test database; final teardown removed that database and its scoped retained-PDF/mail directories. New test accounts use reserved test IPs so the suite does not collide with signup rate limits; application rate limits are unchanged.

The configured workspace database and private configuration were not changed. No real email, live source/AI call, hosted deployment, commit or push was performed. Real SMTP transport, arbitrary/rotated/handwritten scan accuracy, and the user's signed-in Firefox upstream download are not established by these checks. See FEATURE_WORKFLOWS.md for worker and storage setup.
