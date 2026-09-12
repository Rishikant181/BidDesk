# TenderHut implementation handoff — 12 September 2026

The user authorized full implementation, then clarified that this can be treated as a fresh product flow: preserving previous workspace data/PDF interfaces is not required. Credentials were preserved. No database reset was needed; existing retained/legacy imports remain accessible separately from public discovery.

## AI interaction preference

AI actions run directly when clicked. Per-request sharing-consent checkboxes and API consent fields were removed at the user’s request. Keep page selection, source-fact review, project selection, authentication and quotas; these serve different purposes.

## Tender detail presentation

Do not render raw provider metadata, ingestion fields, attachment access notices or JSON record dumps in product pages. Tender details show normalized facts, scope, dates, official links and private preparation controls. Raw data remains internal for debugging. Follow-up audit also replaced JSON amendment comparisons with readable business fields, humanized AI finding labels and removed database/storage implementation wording from document/import screens.

## Presentation preference

The user requested neutral provider branding. Product labels, source badges, errors, extension copy and demo instructions use neutral language. Keep this convention for future edits. Functional endpoint URLs, extension host permissions and internal engineering references remain necessary; neutral copy is not a guarantee of concealing the integration from technical inspection.

## What is implemented

- `/` and completed sign-in/signup lead to discovery. First visits request real public TenderHut results. No source polling, focus listener, scheduler or automatic Gemini call.
- Keyword, state/category, organisation, source portal, buyer group, procurement type, value, closing-date, sort and page filters map to the source API. Stable option metadata is cached in-process for one day. Listing requests still attempt source retrieval on navigation/reload/search submission.
- Actual upstream totals and pagination; CSV export explicitly contains the displayed page. Saved/retained catalogue queries are local and separately labeled.
- Public HTML detail refresh uses source/slug and validates canonical path plus numeric bid link. JSON listing fields and raw `detail_json` are retained; HTML updates only supplied fields. Raw source fields and per-field observation origins/times are retained internally for debugging, not displayed in tender details. Unspecified timezone times remain raw; the normalized calendar display uses date precision rather than inventing an instant.
- MongoDB stores seven-day query/observation caches. Source failure returns the exact prior query with a stale warning, or an availability error if no cache exists. There is no static snapshot fallback for public discovery. Individual opened/saved/matched tenders are durable and use `th-<provider ID>` identities.
- Provider upserts use existing transactional content versions/task events. Unchanged content does not create versions; reference corrections do not change identity. The old unconditional owner/source/reference index is replaced by a legacy-only partial unique index after creating the replacement. Existing unique internal ID index protects provider identities.
- Explicit profile matching issues up to three searches, retrieves at most 150 notices, deduplicates, selects up to 30 candidates for semantic preparation and explains up to five. Stage progress, stopping/resume, owner isolation, cached model calls and quota fallback are wired. Location preferences and selected non-sensitive project scopes participate; private financial evidence does not. Results disclose retrieved/prepared scope and stale profile/tender state.
- Existing manual, PDF extraction, private findings and eligibility review remain usable. Matching uses source metadata with exact excerpt grounding, not fictitious PDF citations or a claim of reviewed eligibility.
- Public official-source URL is prominent. An optional Firefox extension and one-use local transfer pairing are implemented for authenticated TenderHut ZIPs. No TenderHut credential is stored on or forwarded to BidDesk. Actual user-session downloading remains a manual smoke check.
- ZIP import validates archive structure, CRC, paths, symlinks, encryption/method support, entry count and expanded-size limits. Files are private and temporary on local disk; selected genuine PDF bytes can be extracted into the existing private AI-document flow. Unsupported files are download-only, never executed or recursively unpacked.

## Run and demo

Keep `.env.local`; it already contains the user's configured Atlas/auth/Gemini settings. Do not copy `.env.example` over it. The app does not require snapshot import.

```sh
npm ci
npm run check:config
npm run db:indexes
npm run dev
```

Open `http://localhost:3000`. Use Discover for fresh results, Company profile to save capabilities, then **Find tenders matching my profile** to run matching directly. Open a result to review its official link and source fields. Save it or start a bid to retain private preparation work.

For attachments: Documents → **Set up the Firefox extension** gives the downloadable package and temporary installation instructions. Pair in BidDesk, open the extension on a signed-in TenderHut tab, check the displayed destination/tender and explicitly transfer. Return to BidDesk → **Review transferred files** → **Read PDF for review** → Analysis. Choose the pages, then click Analyze to run AI directly. Manual PDF upload works without the extension.

Extension source and detailed instructions: `extension/README.md`. The package is `public/biddesk-attachment-extension.zip`; regenerate after extension edits with `python3 scripts/package-extension.py`.

## Implementation map

- `src/lib/tenderhut/normalize.ts`: JSON/HTML mapping, safe source URLs, partial-field merging.
- `src/lib/tenderhut/client.ts`: validated upstream queries, bounded fetch, request deduplication/backoff, Mongo cache and filter metadata.
- `src/lib/tenderhut/store.ts`: durable provider identity/materialization and source-field provenance.
- `src/lib/tenderhut/matching.ts`, `/api/matching`: explicit profile retrieval, bounded embedding/explanation stages and private runs.
- `src/lib/attachments/{zip,store}.ts`, `/api/attachments`, `/api/attachments/transfer`: one-use scoped pairing grants, file validation, private disk storage and selected PDF extraction.
- `extension/`: Firefox manifest/popup/background, browser-only TenderHut authentication and binary transfer.
- `src/components/attachments.tsx`: pairing and file review, separate from AI consent.
- `tests/fixtures/`: small captured public JSON/HTML examples; test source behavior is confined to random test databases through `BIDDESK_SOURCE_TEST_FIXTURES=1`.
- `scripts/tenderhut-smoke.ts`: bounded public source smoke check; `--ai` adds one actual Gemini explanation using public metadata.

## Evidence and limits

Final verification: 62 unit tests passed; full production browser suite passed five tests with one optional local-PDF-fixture test skipped (2.4 minutes). The official linked-PDF and ZIP-to-PDF extraction browser checks passed. Production build, TypeScript, ESLint and whitespace checks passed. See `docs/VERIFICATION.md` for reproduction.

Public live checks succeeded for listing, keyword search, newest/value sort requests, categories, buyers, sources, BPCL HTML and a richer AAI HTML example. A live software search reported 432 matches at the smoke-check time; two were retrieved and one corresponding HTML identity was verified. One real Gemini explanation passed exact-source excerpt grounding. These are compatibility/quality smoke checks, not completeness or continuous freshness guarantees.

Source requests use fixed TenderHut routes, a 12-second timeout, a 4 MB response cap, at most two simultaneous requests per process and in-flight deduplication. HTTP 429/5xx establishes a short bounded backoff. Long retry delays return retained data instead of blocking a request. Core operation uses no TenderHut login and does not fetch all catalogue pages.

Matching query construction and the 30-item shortlist are deliberately bounded heuristics. They can miss relevant notices and do not analyze the entire upstream catalogue. Matching actions may consume up to 30 new document embeddings plus a profile embedding and a bounded explanation; existing global/user allowances still apply. An AI failure retains basic retrieved opportunities.

HTML dates with no timezone are kept as raw source values alongside date-only calendar fields. HTML-only refresh cannot establish freshness of JSON-only fields. Sparse fields never erase richer fields automatically; source omissions may therefore require manual review rather than proving withdrawal of a requirement.

Attachment caps: 25 MB ZIP, 100 entries, 100 MB total expanded bytes and 20 MB per entry. No encrypted archives, nested extraction, Word conversion or OCR. Files live in ignored `.local/attachments/<random ID>` with private permissions; they expire after 24 hours and are cleaned during subsequent attachment operations. Cleanup is demand-driven, not a scheduled job. Extracted PDF text/provenance persists privately in Atlas, not binary files.

The extension flow has mocked authentication-boundary tests and real local ZIP/PDF integration tests. It has **not** been exercised against the user's actual signed-in Firefox session; no pasted cookies or access/refresh tokens were replayed. Install the extension and perform that manual check. Browser partitioning/session behavior or changed upstream entitlements can require manual download/upload. Chrome packaging, hosted binary uploads and deployment remain outside the tested scope.

This remains a local POC: in-process source concurrency/version serialization is not a distributed ingestion scheduler. No promise of exhaustive awards, amendment history, eligibility coverage or real-time official-portal synchronization is made.
