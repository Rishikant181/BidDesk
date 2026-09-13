# BidDesk

A local procurement workspace with public TenderHut discovery, private document review and bid preparation. TenderHut is the only tender source. This is an evolving, undeployed prototype: iterations may replace prior structures without backward compatibility.

## Run locally

Node 22.16 or newer is required. Preserve the configured `.env.local`.

```sh
npm ci
npm run check:config
npm run db:indexes
npm run dev
```

Open **http://localhost:3000**, create an account, and browse Discover. Use `localhost` consistently with `BETTER_AUTH_URL`. No catalogue import or source credentials are required for public discovery.

Configuration uses `MONGODB_URI`, `MONGODB_DB`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. Optional AI uses `GEMINI_API_KEY`; see `.env.example` for model/allowance settings. Never commit credentials.

## Workflows

- Discover current notices by keyword, region, category, organisation, originating portal, buyer, procurement type, value and deadline. Save opportunities, preview, compare up to four and export the displayed page.
- Browse retained provider records and saved opportunities. Open a tender to recheck source details; optional scheduled monitoring runs through a separate worker.
- Maintain company capabilities, financial/certification evidence and selected project references.
- Attach a PDF to an existing tender, extract text and review AI suggestions with exact page citations. Private findings do not overwrite published source facts.
- Optionally transfer a tender's attachments through the [Firefox extension](extension/README.md), using your browser's authenticated source session. Credentials stay in the browser.
- Review unified eligibility evidence, record human judgments without AI, and turn gaps into linked preparation tasks. Track readiness and decision/submission records.
- Track deadlines, source changes and reminders, export calendar events, and configure optional email delivery.
- Start profile matching to see 10 tender cards immediately, with spinners while their AI explanations load. Scroll for the next ten cards and their explanations.

There is no standalone tender import, spreadsheet ingestion, manual amendment import, award-results page, old catalogue matcher or alternate-source downloader. Submitted/won/lost are personal tracking statuses; official outcomes must be verified on the originating portal. The originating-portal filter operates within the sole provider feed.

## Documents and AI

In a tender, open **Documents & review → Upload a PDF**, or expand **Transfer attachments from the source portal**. PDFs and extracted text are retained privately; analyze selected ranges or remaining readable pages. Only capability text and selected projects are shared for AI review; financial checks remain local. Use public or non-sensitive inputs with the configured free-tier demo.

PDF limits: 20 MB, 250 pages, 25,000 characters/page and 700,000 characters/document. Analysis accepts up to 30 pages and 120,000 characters per run. Explicit local English OCR is available for selected scanned pages; Word conversion is not supported. PDFs extract in a bounded server worker. Original PDFs are retained privately for citation viewing.

ZIP limits: 25 MB compressed, 100 entries, 100 MB expanded total and 20 MB/file. Transferred files expire after 24 hours; extracted text remains private. Other file formats are download-only. The real signed-in Firefox upstream download still requires a manual smoke check.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
BIDDESK_E2E_PRODUCTION=1 npm run test:e2e
```

Browser tests start their own server on port 3001 with a fresh random `biddesk_test_<hex>` database, deterministic provider responses and isolated AI stubs. They remove their test database and never populate demo data with fixtures. No external PDF fixture is needed. Use `npx playwright install chromium` if the browser is missing.

Optional live checks (explicit network/model usage):

```sh
npm run ai:check
npm run test:source:live
npm run test:source:live -- --ai
```

See [implementation notes](docs/IMPLEMENTATION_NOTES.md), [source coverage](docs/DATA_SOURCES.md), [demo steps](docs/DEMO_WALKTHROUGH.md), [verification](docs/VERIFICATION.md) and [UI audit](docs/UI_FUNCTIONALITY_AUDIT.md).

## Boundaries

The app does not submit official bids, provide push notifications or team assignments or promise complete awards/amendment/eligibility coverage. Unknown source facts remain unknown. Date-only values do not establish a precise closing time. Matching selects up to 30 notices by profile-keyword relevance from at most 150 retrieved metadata candidates. It loads ten cards at a time and generates explanations only for loaded cards; relevance is not qualification.

The local prototype has bounded reads (2,000 retained tenders, 200 bids, 50 notifications and 50 versions). Source concurrency is process-local, not a distributed ingestion service. There is no deployment or billing integration. Optional scheduled checks require the monitoring worker.

## Improved workflows

See [feature workflows](docs/FEATURE_WORKFLOWS.md) for readiness, reusable evidence, page coverage, OCR, saved searches, decision records and reminders. Run `npm run monitor` for one check or `npm run monitor -- --watch` for the continuous worker. Email defaults to a private local sink; SMTP delivery requires configuration.
