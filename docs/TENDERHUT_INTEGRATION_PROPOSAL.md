# TenderHut discovery and profile matching proposal

Date: 12 September 2026. **Planning only; not implemented.**

This document records the latest agreed direction and the implementation handoff. It supersedes the snapshot-only product direction in earlier proposals for the next increment, but does not describe current application behavior. The user explicitly stopped implementation to continue planning. The latest request authorizes updating, saving, committing and pushing these planning documents only. Wait for an implementation request before changing application code. No deployment or monetization is included. Read [TENDERHUT_IMPLEMENTATION_PLAN.md](TENDERHUT_IMPLEMENTATION_PLAN.md) for the execution sequence and optional attachment phase.

## Agreed experience

BidDesk remains a usable Indian tender discovery and preparation POC, running locally with MongoDB Atlas Free and the existing Gemini integration. Replace the fixed snapshot as the primary discovery source with requests to **https://tenderhut.in**. Earlier names tender.in and tenderhunt.in were mistaken; use TenderHut and the exact host above.

- Opening discovery for the first time automatically retrieves default tender results. Searching is not required to populate the page.
- Retain a prominent **Find tenders matching my profile** action on the initial discovery page. It searches upstream using the company profile, then ranks the retrieved opportunities with AI. It must not merely search the existing MongoDB catalogue.
- Missing company capability information leads to profile setup; do not fabricate a company profile.
- Ordinary keyword search, supported filters, sorting and pagination query TenderHut and display the corresponding upstream count.
- Opening or refreshing discovery, submitting a search, changing filters or pages, and opening or refreshing a tender detail request current source data.
- **No periodic polling, background timer, focus-triggered refresh, scheduled crawler, or manual refresh control.** Leaving a page open does not update it. Browser/page refresh and navigation are the refresh triggers.
- A prior suggestion to use a five-minute TTL with periodic refresh was explicitly superseded by the user. Do not implement it from earlier conversation context.
- Ordinary browsing does not trigger Gemini. Profile matching is an explicit AI action. Existing explicit document/eligibility AI actions remain available.

“Current” means the latest response available from TenderHut, not continuous synchronization with official portals. Show when BidDesk fetched the response, and distinguish that from TenderHut's reported scraping timestamp.

## Retrieval, persistence and fallback

Use a server-side adapter for public JSON search and public rendered HTML detail refresh. Initial detail rendering uses the search response, including `detail_json`; opening/reloading a tender retrieves `/tender/{source}/{slug}` and updates only fields present there. Do not depend on a separate JSON detail endpoint. Keep the provider replaceable because these are undocumented website endpoints.

MongoDB remains necessary for saved tenders, private imports, notes, bid workflows, source versions, AI provenance and cached responses. Retained records are not a fixed seed dataset or a claim to complete national coverage.

On a navigation/refresh request, attempt an upstream fetch. A cached response may render immediately while that request completes; otherwise use a loading state. On source failure, return the last successful response with a visible stale/availability notice and timestamp. If no cached data exists, show a source error, not fabricated results. Do not silently use the old ISRO snapshot as current TenderHut results.

Coalesce concurrent identical requests and briefly suppress accidental duplicates. Apply timeouts, bounded retries and backoff, especially for HTTP 429/5xx. These protections must not turn normal deliberate refreshes into a five-minute cache hit. Do not bulk-import the reported catalogue or preload all pages. No activity means no refresh work.

Persist enough provider identity and normalized detail for saved items to remain accessible during outages. Keep unchanged content from creating versions or invalidating AI analysis. Changes should use existing version-impact behavior, preserve private findings and judgments, and mark dependent analysis stale. Never delete existing snapshots, private imports, reviews or bid records as a migration shortcut.

Counts need clear scope: upstream search total, retrieved candidates, locally saved records and locally known awards are different quantities. Existing overview/export logic must not imply that locally cached records are the full upstream catalogue.

## Profile-driven matching

On the explicit matching action:

1. Read the user's saved AI-shareable capabilities, offerings, categories, regions and selected non-sensitive project evidence. Preserve existing consent/input controls. Do not send private financial evidence, contacts or bid notes by default.
2. Translate the profile into several focused searches using supported upstream parameters. Suggested initial cap: three queries and up to 50 results per query, with limited concurrency. These are implementation defaults to tune, not verified upstream limits.
3. Combine and deduplicate results by provider identity; apply verified hard constraints. Do not overconstrain with a single long natural-language keyword query or infer that a missing value meets a financial constraint.
4. Rank the retrieved candidates, reusing existing embedding machinery where useful; obtain grounded Gemini explanations for a bounded top set (suggested five).
5. Show why each opportunity matches, concerns and missing information. Label this **best matches among retrieved results**, not an exhaustive search or an eligibility/win guarantee. Show the retrieval scope and partial failures if some searches fail.

Prefer deterministic query construction initially, or validate and cap any model-generated query plan. Never accept arbitrary model-generated URLs. Reuse AI results only when relevant profile, tender content, prompt/model and evidence inputs are unchanged. A repeat action still searches for current candidates, even when explanations can be reused. Keep existing quota, concurrency and token safeguards; failures should preserve ordinary search and useful retrieved results.

Gemini is on the **free tier**. Only public or non-sensitive demo inputs are authorized. No paid service or automatic Gemini invocation during navigation is required.

## Documents and eligibility

The user confirmed that the public JSON `url` field opens the original source. Make **Open official tender** the primary document action, without TenderHut credentials. Original links may lead to a portal/search page, not an individual notice; present the tender reference for locating it. Later captures corrected the initial assumption about attachments: TenderHut also serves authenticated attachment ZIPs itself.

Retain optional PDF upload and existing supported official-PDF analysis. Plan an optional second phase for an operator browser extension: retrieve attachments using the user's existing entitled TenderHut session and transfer files and provenance to the user's local BidDesk workspace. Cookies and Bearer tokens stay in the browser; no shared server-side TenderHut account. Core discovery/matching must work without the extension. Automatic retrieval of arbitrary official-portal PDFs, OCR and login/CAPTCHA bypass are outside scope.

Use available titles, work descriptions and structured details for matching and summaries. Eligibility assessment may use explicit available requirements, but absent fields mean **unknown**. “Please refer Tender documents” is not an eligibility condition and cannot produce a pass.

If metadata-based AI findings are introduced, cite the actual source field/excerpt and the retrieved version. Current PDF citations require document ID, page and exact quote: do not invent a PDF or page 1 for API metadata. Extend the evidence contract explicitly and preserve existing exact citation validation. PDF-grounded eligibility remains an optional deeper workflow for users who upload the official public document.

## Observed endpoint contract and verification status

Research from this planning conversation, not an official API contract:

- An anonymous request to `GET /bids?sort_by=end_date&sort_dir=asc&limit=2&offset=0` returned JSON without cookies, credentials or browser-header spoofing. It reported `total: 85772`; this is a historical response count, not a guaranteed current count.
- The user supplied working default and filtered requests with `limit=50` and complete response examples. The filtered example reported four results.
- The public `/app` JavaScript exposed the endpoint names below. User-provided HTML and authenticated captures further established the routes described here; these were not independently replayed with the user's credentials. Unverified operations remain optional.

| Endpoint | Observed purpose / caveat |
| --- | --- |
| `GET /bids` | Search/list: `{ total, limit, offset, bids: [...] }` |
| `GET /bids/{id}` | Observed in public JS; not required or established as the app's normal detail path |
| `GET /tender/{source}/{slug}` | Public rendered detail HTML supplied for BPCL and Bihar notices; planned single-tender refresh path |
| `GET /categories`, `/buyers`, `/sources` | Filter metadata; verify shapes and access |
| `GET /sources/freshness`, `/stats`, `/stats/timeline?days=30` | Optional coverage metadata; not required for initial integration |
| `GET /bids/{id}/amendments`, `/bids/{id}/cross-links` | Optional detail enrichment; verify access/meaning |
| `GET /bids/{id}/documents` | User supplied Bearer-authenticated request returning attachment metadata, not file bytes |
| `POST /auth/refresh` | User capture shows a refresh cookie used to obtain an access token; browser-only optional extension flow |
| `GET /bids/{id}/documents/zip` | User reports successful ZIP download with Bearer authentication; optional extension flow |

The public app also references authenticated `/documents/{id}` downloads and `/bids/export`; individual download behavior remains unverified. The ZIP path is sufficient for the optional phase. Do not replay credentials pasted in conversation or save them in code, docs, fixtures, logs or BidDesk. Future extension requests must use the operator's current browser session and actual account entitlement without bypassing denials. Local CSV export has explicit retrieved/saved scope and must not trigger a bulk crawl.

### Additional evidence from user captures

Three rendered pages share the title/highlights, labeled `dl.fields`, official-source CTA and numeric `app?bid=` link structure:

| Detail path | Provider ID | Observations |
| --- | --- | --- |
| `/tender/bpcl/1000464360` | `6732969` | Title, reference, organisation, dates, classification and direct BPCL source link |
| `/tender/bihar_eproc/01-2026-27-laxmipur-group-03` | `6716551` | Value `1391245.0`, pre-bid date `10/09/2026`, two categories, generic Bihar source portal and five-document notice |
| `/tender/bpcl/1000463479` | `4817400` | Same structure, omitted financials, direct BPCL source link |

Parse only the current tender's sections. Search form options and related tenders are not its attributes. JSON-LD in these examples contains breadcrumbs, not a full tender record. Use the full `h1`, not the truncated HTML title, and structured labels rather than prose summaries. `Published at` is a source label; `Publish date` is the date. Do not interpret CSS rules for awards/amendments as actual records. Missing HTML fields must not delete richer JSON data or acquire a fresh verification timestamp.

The Bihar page says downloads require a Starter plan, but the user successfully downloaded through their account. Treat the text as an unverified entitlement claim, not a purchase requirement or a guarantee that all free accounts can download all files.

Sanitized attachment observations: `GET /bids/4676877/documents` returned document IDs `9738618` (`DWG_FOR_TPOHMS_25_7.rar`, 10,581,691 bytes) and `9738617` (`TENDER_NOTICE.doc`, 389,120 bytes). Metadata includes `source`, `bid_no`, `filename`, `original_url`, `local_path`, `content_type`, `file_size`, `downloaded_at`; content types were empty. `local_path` is not a proven public URL and `original_url` does not establish the actual download route. A separate `GET /bids/6716549/documents/zip` request was reported to download a ZIP. These are different tender IDs: do not assume that ZIP contains the two files from the metadata example. Actual ZIP headers, contents, size, token expiry handling and extension mechanics remain to verify during implementation.

Observed list parameters:

```text
keyword, state, source, category, buyer, end_after, end_before,
min_value, max_value, bid_type, organisation, location,
classification, sort_by, sort_dir, limit, offset
```

`category`, `buyer` and `location` are joined comma-separated values in the public app. Frontend URL `categories` maps to API `category`. Verified sort example: `sort_by=end_date&sort_dir=asc`. Do not assume all existing BidDesk filter/sort semantics have direct equivalents. Verify combinations and supported values; avoid client-side filtering of one upstream page while displaying the unfiltered upstream count.

Reproducible small listing request:

```sh
curl --fail --silent --show-error --max-time 20 --compressed \
  'https://tenderhut.in/bids?sort_by=end_date&sort_dir=asc&limit=2&offset=0'
```

User's filtered example, decoded for readability:

```text
category=Buildings & Structures,Civil Repair & Renovation,Earthwork & Site Development,Roads & Bridges
buyer=sec-ministries
min_value=100000
max_value=1000000
location=Delhi,Haryana,Himachal Pradesh,Jammu & Kashmir,Ladakh,Punjab,Rajasthan,Uttarakhand,Uttar Pradesh
classification=Services
sort_by=end_date
sort_dir=asc
limit=50
offset=0
```

Use URLSearchParams to encode values. This returned IDs `5993233`, `4346054`, `4034418`, `6953345` in the supplied response. `buyer=sec-ministries` also returned a Punjab agriculture notice, so its meaning must be verified rather than inferred from the label.

Earlier research files `/tmp/tenderhut-bids.json`, `/tmp/tenderhut-app.html`, `/tmp/tenderhut-app.js` may still exist, but are ephemeral and not required to resume. The observed asset was `/assets/index-BsNnWPMI.js`; discover the current asset from `/app` if necessary instead of hardcoding its hash.

## Normalization and data quality

| Source fields | Handling |
| --- | --- |
| `id`, `source`, `bid_no`, `slug` | Preserve provider ID and original portal identity separately. Use a stable provider key; title/reference changes must not duplicate saved tenders. Slug alone is not identity. |
| `items`, `organisation`, `department` | Title, authority and department; preserve original strings and render safely. |
| `url` | Original portal link; validate scheme and never use arbitrary URLs as unrestricted server fetch targets. |
| `categories`, `matched_keywords` | Comma-separated source labels; normalize without discarding originals. |
| `state`, `location` | `National` may be a placeholder, not evidence of nationwide work. Preserve uncertainty. |
| `value_inr`, `estimated_value`, `emd_amount`, `tender_fee` | Parse Indian comma formatting; retain missing/zero distinctions and original text. `estimated_value="0"` with `value_inr=null` is not necessarily a free contract. |
| `start_date`, `end_date` | Mixed date-only and local date-time strings. Preserve precision; do not invent a deadline time. Confirm timezone convention before normalization to an instant. |
| `scraped_at`, `last_amended_at` | Observed timestamps lack timezone and may include microseconds. Retain raw values, separate from BidDesk's own UTC retrieval timestamp. |
| `detail_json`, `corrigenda_json` | JSON encoded inside strings, sometimes empty. Parse defensively with size limits; preserve provenance and detect conflicts. |
| `first_doc_id`, `amendment_count`, `cross_link_count` | Hints, not proof that downloadable PDFs, complete amendment histories or duplicates are available. |
| `bid_status`, award fields, eligibility fields | Often empty. Never invent active/awarded status, supplier, turnover, experience or exemption facts. |

`detail_json` can contain `Tender ID`, `Tender Reference Number`, `Title`, `Work Description`, `NDA/Pre Qualification`, `Tender Value in ₹`, `Tender Fee in ₹`, `Processing Fee in ₹`, `EMD Amount in ₹`, `EMD Exemption Allowed`, `EMD Percentage`, publication/submission/opening dates, contract duration, location, pincode and contact information. NIT/work-item document names inside flattened text are not download URLs.

Observed anomalies include a publication date after the closing date, top-level fields missing values present in detail JSON, generic official URLs, and dates with different precision. Retain conflicts for review. Do not assume the current source-comparison rules for specific ISRO references generalize to all providers.

The site's public terms observed during research prohibit disruptive/high-volume scraping and say to contact them for bulk or programmatic access. This is not a documented licensed API. The user was informed and chose public scraping for the POC. Keep requests bounded and respect denials/rate limits; do not bypass authentication or contact anyone without explicit authorization. Endpoint availability can change.

## Existing implementation to preserve

At proposal save time, latest commit was `3155a38` (`feat: add Gemini tender analysis and opportunity matching`), branch `dev`; working tree was clean before these documentation edits. The existing product still uses the 77-record real ISRO snapshot. No TenderHut integration code has been written.

Read `docs/IMPLEMENTATION_NOTES.md`, `docs/GEMINI_IMPLEMENTATION_NOTES.md`, and applicable AGENTS instructions before implementing. Preserve `.env.local`, Atlas demo records and private user data. Do not re-import/reset the catalogue to start this increment. Use the installed lockfile and read relevant installed Next.js docs before framework changes.

| File / area | Expected work |
| --- | --- |
| `src/lib/schemas.ts`, `domain.ts` | Provider identity, metadata provenance, date precision and missing-value handling |
| New provider/cache modules under `src/lib/` | Validated allowlisted query adapter, bounded public fetch, caching, coalescing and failure handling |
| `src/lib/store.ts`, `db.ts` | Stable upserts, indexes, source versions and private-workflow preservation |
| `src/app/api/data/route.ts` | Upstream discovery/detail reads; preserve workspace ownership, saved-item semantics and scoped export |
| `src/components/discovery.tsx`, `application.tsx`, `context.tsx` | Initial results, supported filters, navigation-triggered fetch, stale/error states and matching entry point |
| `src/components/tender-detail.tsx`, `workspace-views.tsx` | Latest detail, official link, scoped counts and freshness labels |
| `src/components/ai-matching.tsx`, `src/lib/ai/service.ts` | Profile-driven upstream retrieval before bounded matching/explanations |
| `src/lib/ai/contracts.ts`, `grounding.ts`, AI UI | Explicit field-based evidence if metadata analysis is added; retain PDF evidence semantics |

Existing local discovery/workspace reads have small-catalogue caps (including 2,000 tenders); do not carry those into a misleading upstream total or rank only that old local set. Existing matching relies on reviewed scopes for a small subset of ISRO records and must gain the new candidate retrieval path.

Preserve the PDF worker's `{pdfBase64}` envelope, canonical document-ID prompt projection, strict quote validation, date/reference conflict fixes, private review ownership, transaction-based task impact and AI allowance guards. See existing notes for regression context.

## Implementation sequence once requested

1. Inspect current status and notes; verify only a few public detail/filter responses and keyword semantics. Record actual access failures and avoid depending on denied endpoints.
2. Implement and test provider normalization, stable identity, query validation and bounded retrieval/cache behavior.
3. Wire initial discovery, search/pagination and fresh detail navigation; integrate saved records/version changes and accurate fallback labels.
4. Add profile-to-search candidate retrieval to the existing explicit matching action; preserve AI consent, grounding, caching and quotas.
5. Adjust document actions and metadata evidence as needed, keeping optional PDF workflows working. Update overview/count/export scope and remove misleading primary snapshot labels.
6. Verify with deterministic isolated tests plus a small anonymous live-source smoke check; update implementation notes and demo walkthrough with the actual completed behavior and limitations.

## Acceptance checks

- A new account sees actual default upstream results without first searching or importing data.
- Matching uses the saved profile to issue upstream searches and can return opportunities absent from the local database; missing profiles guide setup.
- Search filters, sorting, pagination and totals agree with the requested upstream query; saved/private views retain their own clearly defined scope.
- Page refresh/navigation attempts source retrieval. An idle page makes no periodic requests, and ordinary browsing makes no Gemini calls.
- Opening a tender obtains available fresh detail; failure preserves saved data with honest freshness status.
- Repeated unchanged responses do not duplicate tenders/versions/events; source changes preserve private notes and invalidate dependent findings appropriately.
- Unknown amounts, inconsistent dates, missing eligibility conditions and generic source links are handled explicitly.
- No PDF download promise is made from `first_doc_id` or document names. Official links and optional local PDF review work.
- Free-tier AI failures leave discovery usable; explanations cite available evidence and do not claim exhaustive coverage or qualification.
- Test providers remain restricted to fresh isolated test databases. No invented fixtures enter the real demo catalogue.

Last recorded existing verification: 50 unit tests passed; lint, typecheck and production build passed. Treat these as baseline history, not verification of this proposal. Run appropriate unit/browser checks and `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` after implementation. Browser tests use their own guarded random database and port 3001; never point tests at the demo database.

## Resume instruction

The immediate next step is further planning or implementation **only when the user asks**. The decisive constraints are: public TenderHut discovery, automatic initial results, explicit profile-based upstream matching, navigation/refresh-driven freshness, no periodic updates, and optional PDF analysis. Recheck this document before using older plans.
