# BidDesk

A local tender discovery and bid preparation POC using real Indian notice metadata, Next.js, and MongoDB Atlas. No paid AI, hosting, payment integration, or live scraper is required.

## Run locally

Tested with Node **24.18.0** and npm **11.16.0**. Use Node 24 LTS.

```sh
npm ci
cp .env.example .env.local
```

Skip the copy if `.env.local` already exists. Set `MONGODB_URI`, `MONGODB_DB`, `BETTER_AUTH_SECRET` (at least 32 random characters), and `BETTER_AUTH_URL=http://localhost:3000`. Generate a secret locally with `openssl rand -hex 32`. Keep this file private. Your Atlas database user must have read/write access to the selected database; allow your local IP in Atlas Network Access.

```sh
npm run check:config
npm run db:indexes
npm run data:import -- --file data/public/isro-tenders.json
npm run dev
```

Open **http://localhost:3000**, then create an account. Use `localhost` consistently with `BETTER_AUTH_URL`. The user's existing Atlas connection is configured and the 77-notice snapshot has already been imported in this checkout. Re-importing identical content does not create duplicate tenders or versions.

For a production-mode local rehearsal, stop the dev server, then:

```sh
npm run build
npm start
```

The build uses Next.js's supported Webpack option because Turbopack production CSS processing encountered a socket restriction in the development environment. Development uses the default Next.js bundler. Nothing is deployed.

## What works

- Account sessions and private workspaces backed by Atlas.
- Real-notice search, filters, sorting, pagination, quick preview, favorites, comparison, and CSV export.
- Source links, dates, financial unknowns, private notes, document text, and version comparison.
- Company evidence and conservative requirement assessments; no invented eligibility guarantees.
- Bid pipeline, linked checklists, task owners/dates/notes, checklist export, and calendar.
- Reviewed manual/CSV/PDF imports. PDF text extraction runs on the user's device.
- Imported updates preserve versions, reopen affected tasks, and generate in-app notifications. Updates and their effects commit in one Atlas transaction.
- Private award import/search and basic coverage counts. There are no preloaded awards.

## Data and demo instructions

Read [source coverage](docs/DATA_SOURCES.md) and the [presentation walkthrough](docs/DEMO_WALKTHROUGH.md). The shared catalogue contains **77 ISRO notices retrieved on 11 September 2026**, including two notices enriched from original PDFs. This is an imported snapshot, not a live feed. Most records retain reference-based titles and advertised windows. Unknown amounts are not zero.

Use **Import a tender** for new private notices, CSV files, or reviewed PDF text. Each account sees the shared catalogue plus its own imports. Public notices can receive private notes and requirements; ordinary users cannot rewrite the shared source data. A private tender's **Import amendment** action retains its source/reference and creates a new version when content changes.

The local `data:collect` and `data:refresh -- --source isro` commands are maintenance utilities, not required demo steps. They fetch current listing metadata only and can replace PDF-enriched metadata with the listing's more limited fields. Do not run them during a prepared snapshot presentation. No scheduler, cron job, or background polling is configured.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

The browser suite starts its own server on port 3001, creates a randomly named `biddesk_test_<hex>` database on your Atlas cluster, seeds real catalogue metadata, tests two-user isolation and private test records, then removes only that run's database. Its credentials therefore need permission to create/use a separate test database. It never resets the configured demo database. Avoid concurrent runs. If interrupted, the generated database name is recorded in ignored `.local/e2e-database.json` for manual cleanup.

To include the real PDF rehearsal, download a text-based official PDF to your own filesystem and run:

```sh
BIDDESK_TEST_PDF=/absolute/path/notice.pdf npm run test:e2e
```

For the same suite against the built production server, first run `npm run build`, then prefix the test command with `BIDDESK_E2E_PRODUCTION=1`.

Without that variable, the optional source-PDF test is explicitly skipped. The test database contains labelled fixtures for edge cases; those fixtures are never imported into the demo catalogue. Local screenshots and traces remain ignored.

## Practical limits

- Atlas requires an internet connection. No mock database or offline persistence fallback is supplied.
- One private workspace per account; task responsibility is a label, not an invitation system.
- No email verification/recovery service. For this local POC, create another account if access is lost; data transfer requires deliberate database administration. Do not delete existing accounts to reset a password.
- PDF limits: 20 MB file, 250 pages, 25,000 extracted characters per page and 700,000 per document. No OCR. Original private PDFs remain local; reviewed text persists in Atlas.
- CSV: up to 100 rows per import; 2 MB API body limit. Invalid rows are explained and skipped; reduce batch size for long text.
- Discovery/export and dashboard operate on at most 2,000 records; workspace loads up to 200 bids, 500 awards, 50 notifications, and detail loads up to 50 versions. This is a small-catalogue POC. Large document/version responses require pagination before hosted use at scale.
- Amount filters use INR; other currencies are retained and displayed, not converted. Eligibility supports simple INR minimum turnover with matching financial periods, exact certifications with expiry/evidence, declared regions, and manual experience review.
- No genuine official amendment pair or published award dataset was preloaded. Version impact is tested using isolated fixtures. PDF metadata enrichment is clearly labelled and must not be presented as an official corrigendum.
- Local demo operation needs no additional paid API/service. Future hosting limits and plan eligibility must be reviewed separately; deployment is outside this implementation.

## Repository map

`src/app` contains routes; `src/components` contains the workspace views; `src/lib` contains schemas, authorization/data services, eligibility logic, and the ISRO parser. `scripts` contains local setup/import commands. `data/public` holds the attributed, dated real snapshot and checksum. `tests` holds unit and browser/integration checks.

The original decisions remain in [PROPOSAL.md](PROPOSAL.md) and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). API research is archived in [docs/TENDER_API_RESEARCH.md](docs/TENDER_API_RESEARCH.md); those APIs are not integrated.

For continuing development in a later session, start with [Implementation notes](docs/IMPLEMENTATION_NOTES.md).

## Gemini assistance

Document drafts, AI-assisted evidence review, human judgments and semantic recommendations are implemented. Add `GEMINI_API_KEY` to `.env.local` and restart; live checks now pass with Gemini 3.6 Flash and Gemini Embedding 2. Manual workflows remain usable without it.

Start with **Company profile → AI-shareable capabilities**, then **Open tender → Analyze documents**. Review source excerpts before applying suggestions. **AI recommendations** ranks described notices only; nine reviewed PDF scopes supplement the original snapshot.

See [Gemini setup, walkthrough and implementation notes](docs/GEMINI_IMPLEMENTATION_NOTES.md) for configuration, real-data preparation, limits and the live verification command. The [accepted implementation plan](docs/GEMINI_IMPLEMENTATION_PLAN.md) records the design decisions.
