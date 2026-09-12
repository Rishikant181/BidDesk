# TenderHut implementation plan

12 September 2026 — planning only. Implements the agreed [proposal](TENDERHUT_INTEGRATION_PROPOSAL.md) when the user requests implementation. No application changes are part of writing this plan.

## Delivery scope

Core integrated local POC increment: public JSON discovery, public HTML detail refresh, profile-driven upstream searches followed by AI ranking, and continued private preparation workflows. A separately testable optional second phase adds browser-assisted authenticated attachment ZIP retrieval. No polling, scheduled jobs, deployment, monetization or bulk crawling. Preserve optional PDF analysis and all existing data. The user has authorized saving, committing and pushing this updated plan only, not implementation.

Use the existing Next.js/Atlas/Gemini stack. No new infrastructure is needed. Work in the sequence below, keeping each stage reviewable; complete all required stages before calling the increment finished. The endpoint investigation is the first implementation gate, not an assumption that every observed endpoint works.

## 1. Establish the public contract

Read implementation notes and relevant installed Next.js docs, inspect git status, and preserve private configuration. Baseline at planning: `d115402` on `dev`, including the saved proposal.

Make a small number of anonymous requests to verify:

- Default list and a short keyword query with pagination.
- The three user-supplied rendered detail examples and a missing page; verify anonymous access and identity checks. A separate JSON detail endpoint is not required.
- Category/buyer/source option shapes and supported sort values.
- Date, value and location filtering, including whether default results exclude closed notices.

Record response shape, HTTP outcomes and ambiguous semantics in a source-contract note. Keep small sanitized public test fixtures with retrieval provenance; do not copy the entire catalogue. Use the saved proposal's observed URLs and examples rather than restarting broad research.

Initial detail rendering uses the listing JSON and `detail_json`. Opening or refreshing detail fetches the public `/tender/{source}/{slug}` HTML page, using stored source/slug from the listing rather than guessing a slug from the reference. If unavailable or unparseable, show the retained listing/detail with accurate timestamps. An exact-ID search may be a fallback only if verified. Never pretend an old listing was refreshed because an unrelated request succeeded. Unsupported filters are omitted or clearly confined to local views. Do not bypass access controls.

**Done when:** the adapter's supported operations are based on actual responses, with explicit fallbacks for unavailable operations.

## 2. Build the source adapter and normalization

Suggested modules under `src/lib/providers/tenderhut/`: `contracts.ts`, `query.ts`, `normalize.ts`, `client.ts`. Keep public network access out of components and AI prompts.

- Validate query lengths, enums, numeric bounds and pagination. Construct URLs only against the fixed TenderHut host and known paths. Use `URLSearchParams`.
- Retain the existing 15-row discovery page size if the source accepts it; map page to offset. Profile retrieval uses a separate bounded batch size. Default sort is closing date ascending. Expose only verified alternative sorts.
- Parse list JSON and detail HTML independently. Add `html.ts` using the existing Cheerio dependency; no headless browser is needed for supplied rendered pages. Handle malformed `detail_json`, nulls, string numbers, Indian comma formatting and oversized responses without corrupting persisted data.
- For HTML, scope extraction to the current tender's `h1`, highlights, field groups and source CTA. Pair `dt` labels with their `dd` values; preserve multiple category tags. Validate the canonical path and `app?bid=` identity against the stored record. Exclude forms, related tenders, scripts, styles and navigation; do not ingest whole-page prose as tender scope. Treat a missing identity or unexpected layout as a parse failure, never an empty successful update. Revalidate allowed host/path on redirects.
- Preserve provider ID, original portal/source, raw reference, source URL, categories array, field provenance and precision. Keep the legacy category string compatible for existing views while migrating filters and matching to all categories.
- Treat date-only deadlines as date-only. Store unverified local date-time/timezone data explicitly; avoid invented UTC conversion or countdown precision. Keep upstream scraping times separate from BidDesk retrieval time.
- Preserve missing/zero distinctions, uncertain `National` locations, inconsistent dates, and top-level/detail conflicts. Unknown eligibility remains unknown.
- Render source text safely. Do not interpret flattened document names as URLs or fetch arbitrary official URLs from this adapter.

Initial protective defaults, adjustable after the smoke check: 10-second upstream request timeout, two concurrent requests per process, bounded response bytes, at most one transient retry within an overall request deadline. Honor `Retry-After`; do not sleep through a long rate-limit interval inside a web request. Return cached data or an availability error instead.

**Done when:** unit tests cover mapping, missing values, malformed responses, date precision, query encoding and rejected URLs/parameters.

## 3. Add stable persistence and request-driven caching

### Identity and versions

Use a namespaced provider identity `(provider = tenderhut, externalId)`; retain the current internal tender ID across updates. Do not deduplicate by title, slug or reference. The same notice appearing under different provider IDs may be marked potentially related, but must not be merged automatically.

Current `saveTender` requires immutable source/reference, and `db.ts` creates a unique `{ownerId, source, reference}` index. Add a dedicated provider-upsert path which allows provider-reported reference corrections while preserving the existing manual-amendment rules. Reuse transactional version/event reconciliation rather than maintaining a second incompatible history mechanism.

Plan an idempotent index migration: classify existing/imported tenders with an explicit legacy identity kind, build a legacy-only partial unique source/reference index and a provider-only unique external identity index, verify them, then retire the old unconditional source/reference index. New manual imports must set the legacy kind. Do not drop the old index before its replacement protects existing records; test interrupted migration/resume and concurrent provider upserts in an isolated database.

Separate source observations from normalized business content. Retrieval timestamps and response order do not create content versions. Retain predecessor-sensitive A → B → A history. Serialize or guard concurrent updates so an older request completing later cannot replace a newer observation; local request ordering is not proof of upstream freshness.

Listing JSON and rendered detail HTML have different completeness. Neither is inherently more authoritative simply because it is named detail. Store observations separately, merge only actual supplied fields and retain per-field origin, observation time and conflicts. Empty or absent fields from either surface must not erase richer details, requirements or uploaded evidence. An HTML refresh does not reverify JSON-only facts; a listing refresh does not reverify HTML-only facts. Separate source-field changes from template wording changes and relative badges such as “Today.”

### Cache and durability

Add query-response and provider-observation cache collections with normalized keys, response provenance, retrieval timestamps and expiration metadata. TTL is for storage cleanup, **not a rule to skip a deliberate refresh**. Suggested transient retention: seven days, configurable and bounded by response size. Private matching runs/query plans stay owner-scoped; public source payloads may be shared without exposing private profile/query history through APIs.

Avoid creating permanent full versions for every row encountered in search. Keep browse-only observations in the expiring cache. Materialize a durable tender when opened, saved, added to a bid, reviewed or retained as a matching result, before creating a dependent reference. Use deterministic provider addressing or an atomic mapping so cache expiration never changes a saved tender's ID. Durable records and their referenced versions/evidence have no cache TTL.

Navigation requests attempt the source first. For the initial POC, use a loading state followed by fresh data or cached fallback; this is simpler than returning stale content and scheduling post-response work. A mounted UI may keep its old rows visible while the request is pending. In-flight deduplication prevents duplicate simultaneous fetches; do not cache successful responses for five minutes as a substitute for fetching. Use bounded error backoff during outages and explain when it delays another attempt.

Return a shared freshness envelope, for example:

```ts
type Freshness = {
  state: "fresh" | "stale" | "unavailable";
  fetchedAt: string | null;
  attemptedAt: string;
  upstreamScrapedAtRaw?: string;
  warning?: string;
};
```

Cache failure must not falsely become a source failure: where a successful public response can still be shown, report it accurately and keep persistence-dependent actions explicit. Authentication/database outages retain the application's normal availability behavior.

**Done when:** concurrent upserts produce one identity; unchanged fetches create no events; sparse lists cannot destroy details; genuine changes invalidate dependent reviews and preserve private notes; stale fallback timestamps remain honest.

## 4. Wire discovery, detail and the workspace

Extend the existing data API with explicit provider-backed discovery and detail operations; retain local saved/private queries. Components should not need to know upstream URL syntax.

- Discovery mounts with a default request and a prominent **Find tenders matching my profile** action. Show loading, empty, partial and unavailable states.
- Submit keyword searches deliberately; do not call upstream on every keystroke. Filter, sort and page changes request the corresponding source results. Cancel obsolete UI requests and ignore late responses from previous queries.
- Use verified filter metadata instead of deriving global options from the small local catalogue. Cache stable option lists separately; absence of an optional metadata endpoint must not prevent keyword discovery.
- Preserve source totals and pagination. Never apply additional local filtering to one page while presenting its upstream total as the filtered total.
- Opening or reloading a detail fetches its available latest source observation. A card preview can use its listing payload without extra detail fetches. Comparison can use retained observations with visible timestamps rather than automatically issuing several unrelated refreshes.
- Favoriting and bid creation first resolve/materialize the provider tender. Continue the current owner-scoped notes, reviews, bids and notifications behavior.
- Keep saved/private/legacy records accessible in clearly scoped views. Do not mix legacy snapshot rows into default live discovery.
- Overview shows private workflow counts and clearly labeled retrieved opportunities. Do not fetch the full catalogue through workspace initialization or repeatedly on favorite toggles.
- Export the displayed retrieved page or an explicitly selected saved set; label the scope. Do not use TenderHut's authenticated export endpoint or imply full-search export.

Freshness triggers are initial mount, deliberate page refresh, query/filter/pagination change and opening/reloading detail. No intervals, visibility/focus listeners, cron or manual refresh button. Review actual Next.js navigation behavior so route reuse does not silently suppress a requested fetch. Keep network work awaited in request scope; no fire-and-forget background ingestion.

**Done when:** a fresh account sees source results, navigation rechecks the source, idle pages make no requests, local mutations do not cause unwanted upstream refreshes, and ordinary browsing makes zero Gemini calls.

## 5. Change matching from local lookup to profile-based retrieval

Current `AIMatching.prepare()` embeds every locally described candidate; `candidates()` reads at most 2,000 local tenders. Replace that preparation path for live matching. Do not leave a hidden local-catalogue dependency.

Implement an owner-scoped matching run with bounded stages and progress:

1. **Plan searches:** validate the saved shareable profile and selected projects, then deterministically derive up to three short capability/category searches and explicit region constraints. Save the plan in the run. Do not send financial facts or private evidence to the source. Keep region/category constraints only when supported and intended; unrecognized profile terms must not silently exclude everything.
2. **Retrieve:** execute at most three searches, each up to 50 results, with limited concurrency. Store per-query outcomes and deduplicate by external ID. A repeat matching action performs retrieval again. If all queries fail, show the previous run as stale; if some fail, continue with an explicit partial-coverage warning. Do not automatically fan out into more searches.
3. **Prepare candidates:** assemble source text from available title/work description and named metadata fields. Mark it as upstream metadata, not human-reviewed PDF scope. Prefer richer existing reviewed evidence only for the same tender/version and authorized owner. Record the exact candidate set and hashes.
4. **Rank:** reuse semantic embeddings for unchanged text. Start with a maximum of 30 candidates for new embedding preparation per run, selected deterministically by scope overlap while retaining diversity across queries. Rank existing valid vectors as well. This is a budget decision: report the actual embedded/ranked count rather than claiming all 150 were semantically analyzed. Bound each text and batch/request by existing token and quota controls.
5. **Explain:** use one bounded generation call for up to five strongest results, with exact validated excerpts and source/version provenance. Display match reason and missing information separately from eligibility.

Suggested server actions: start/retrieve, prepare a small embedding batch, finalize/rank. Each is authenticated and tied to an owner/run ID; use leases/idempotency to avoid duplicate spend on retries or double clicks. The UI advances stages only during this explicit action, can stop after an in-flight request, and can resume cached work. This avoids one very long request and preserves the existing cancellation model. It is not periodic updating.

On a Gemini quota/error, keep retrieved opportunities visible with a clearly labeled basic relevance order or cached valid explanations. Never display deterministic output as new AI analysis. A changed profile or tender hash marks the corresponding result stale. Per-run hashes prevent a later click or another user's run from overwriting the active result.

**Done when:** an unseen upstream tender can appear as a profile match, repeated unchanged analysis reuses AI work while repeating retrieval, partial source/AI failure is useful and honest, and no profile data crosses account boundaries.

## 6. Adjust documents and evidence without expanding the scope

Make **Open official tender** primary and show/copy the official reference when the link opens a generic portal. Offer **Upload official PDF for analysis** as an optional action. Keep existing supported official ISRO downloads and extraction fixes working; do not extend arbitrary remote PDF fetching in this increment.

Structured API details can be rendered directly without spending AI tokens. Keep document-based extraction and eligibility available for uploaded/supported documents. For matching explanations, validate source metadata excerpts against the matching run's exact text and field provenance.

General metadata-to-draft or metadata-only AI eligibility is not a prerequisite for this increment. If included later, introduce a discriminated field-citation contract separate from PDF citations and explicit incomplete-coverage handling. For now show missing eligibility as requiring official-document review; don't synthesize confirmed requirements from empty upstream columns.

**Done when:** the main demo does not depend on a PDF download, optional PDF regression tests pass, and matching never fabricates page citations or human review status.

## 7. Verification and handoff

Use deterministic source fixtures only in guarded isolated test databases, following existing Gemini-test restrictions. Tests must not depend on the live source remaining identical and must not reset demo data.

Required focused checks:

- Adapter and identity tests from stages 2–3, including reference correction, legacy-index migration, concurrent requests, A → B → A history and sparse payload preservation.
- HTML fixtures based on supplied BPCL/Bihar examples: full title rather than truncated meta title, provider-ID mismatch, multi-category fields, absent financials, pre-bid date precision, generic official links, missing layout, and unrelated-form/related-tender contamination. Compare JSON and HTML without marking all merged fields freshly verified.
- Browser journey: fresh account → default results → filter/page → open detail → favorite → bid; revisit with a changed fixture and verify version/task impact.
- Browser journey: saved company → profile search → unseen candidate → grounded explanation; repeat with unchanged data, altered profile, quota exhaustion and partial source failure.
- Refresh test: hard reload and detail navigation cause requests; idle time, focus return and workspace mutations do not. Use request instrumentation/controlled time to verify absence of timers rather than a long live wait.
- Outage journey: cached results clearly stale, empty-cache error clear, saved items/private notes preserved. Verify route changes cannot display a late response under the wrong query.
- Existing auth isolation, imports, document worker, citation identity, conflicts and manual/PDF eligibility regressions.

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and the relevant isolated browser journeys. Use a very small anonymous live-source smoke check for list/detail/filter compatibility and one bounded real Gemini matching smoke test with public/non-sensitive input if configuration is available. Record what actually ran and any failed endpoint/quality gate.

Update implementation notes, data provenance, verification record, README and demo walkthrough. Describe partial coverage, detail endpoint limitations, cache retention and AI limits as implemented. Do not call the product continuously real-time or a complete award/intelligence feed. Leave deployment and new commit/push actions to the user's instruction.

## Proposed review checkpoints

1. Source contract and normalized fixtures established.
2. Live browse/detail plus preservation and stale fallback working.
3. Explicit profile retrieval/matching and optional document flow working.
4. Integrated tests, real smoke evidence and handoff complete.

These are engineering checkpoints within the core implementation increment, not repeated permission gates. Public JSON and HTML are the planned sources; retained-data fallback covers request/parser failure. The optional attachment phase below is separate from core completion and must be reported separately.

## 8. Optional phase — authenticated attachment ZIPs through a browser extension

### Evidence and intended experience

User captures establish this proposed sequence, without independent replay of credentials:

```text
TenderHut browser session
  POST /auth/refresh (browser refresh cookie) → access token
  GET /bids/{id}/documents (Bearer token) → attachment metadata
  GET /bids/{id}/documents/zip (Bearer token) → ZIP download
  explicit transfer → paired local BidDesk workspace
  select supported PDFs → existing consent/review/AI workflow
```

Keep the extension optional and operator-driven: it assists the currently signed-in user's own entitled downloads. No centralized TenderHut credentials, shared account access, automated session renewal service, paid-plan bypass or automatic attachment download on tender opening. The user observed successful download; do not require purchase based solely on the page's Starter wording or assume every account/file has identical access.

### Browser authentication boundary

Target the user's Firefox environment first; verify actual extension APIs and browser constraints before choosing the manifest and execution mechanism. Prototype session-bound requests on the exact TenderHut origin, preferably letting the browser include its existing session cookie without reading/exporting it. Confirm cookie attributes, token handling, extension/page execution isolation, CORS/CSP and download behavior rather than assuming extension fetch automatically shares the page session.

The access token may exist transiently in the browser for the requested operation. Do not store refresh cookies or tokens in BidDesk, extension persistent storage, logs, fixtures, URLs or analytics. Do not save the pasted session values anywhere or replay them. If session renewal fails, ask the operator to sign in normally; retry refresh at most once for an expired access token, and respect authorization/rate-limit failures.

Request only necessary permissions for `https://tenderhut.in/*` and the explicitly paired local BidDesk origin. Avoid blanket all-sites/cookie access, arbitrary URL fetch relays and forwarding tokens across redirects. Use fixed endpoint construction and validated numeric bid IDs.

### Pairing and transfer

Pair through the authenticated local BidDesk UI using a short-lived, single-use, scoped transfer grant. Bind it to the account, tender/provider ID and expected operation. Display destination workspace and tender before transfer; require an explicit user action. Validate extension messages/senders and destination origin; arbitrary websites must not be able to trigger downloads or upload files to localhost. Do not rely on CORS or possession of a guessed tender ID as authorization.

Transfer only archive/file bytes and sanitized metadata: provider/tender identity, attachment IDs where known, filename, actual type/size, source endpoints/links, timestamps and content hashes. Never forward raw request headers. Verify tender identity before attaching and keep resulting files/findings private to the paired workspace. Do not assume an archive's entries map one-to-one to the listing without checking.

Use a dedicated bounded binary/multipart upload path, not the existing 2 MB JSON data API. Determine whether streaming/chunking is needed during the prototype. Handle disconnect, cancellation, duplicate import and expired grants; do not leave orphaned temporary files or grant reuse after success. This phase is local-only; do not claim the binary transfer/storage path fits a hosted free tier without separate verification.

### Archive and file handling

Proposed initial caps: 25 MB compressed archive, 100 MB total decompressed bytes, 100 entries, and 20 MB per PDF (existing document limit). Enforce actual streamed/extracted counts and bytes rather than trusting ZIP headers; tune only with measured legitimate examples. Reject absolute/traversal paths, symlinks, duplicate normalized paths and excessive compression ratios. Never execute attachments or recursively unpack nested archives. Treat encrypted/unsupported archives as manual-download cases.

Inspect file signatures; filenames and upstream `content_type` are insufficient (the supplied metadata had empty content types). Show the extracted file inventory before processing. Only selected supported PDFs enter the existing bounded extraction and Gemini consent flow. `.doc`, `.rar` and other unsupported files remain download-only; no Word conversion, macros, OCR or nested RAR extraction in this phase. An HTML login/error page returned as HTTP 200 must not become a ZIP/PDF.

Preserve attachment provenance and hash-based deduplication. Keep credentials out of hashes/URLs used for records. Default to private document text/metadata persistence consistent with the current app, with temporary ZIP/binary cleanup after the operation; do not introduce permanent Atlas binary storage silently. Manual browser download followed by PDF upload remains the fallback if the extension or archive import cannot complete.

### Verification and completion

Before implementation, verify the ZIP response Content-Type/disposition, real file bytes, session expiry behavior and actual archive sizes using the operator's current browser session. The captured metadata example was tender `4676877`; the ZIP example was tender `6716549`. Do not assume identical contents. `/documents/{id}` individual-file behavior remains optional and unverified.

Test successful pairing/download/PDF selection; account isolation; missing/expired session; access denial; mismatched tender ID; expired/replayed transfer grant; malicious sender; redirect token leakage; spoofed MIME; oversized/traversal/bomb/nested archives; duplicate files; cancelled transfer; and temporary-file cleanup. Confirm no TenderHut credential reaches the BidDesk server or persistent extension storage and no Gemini call occurs before selection/consent.

Done when a user can explicitly transfer their entitled ZIP, review its contents and analyze a supported public/non-sensitive PDF, while core discovery and matching remain fully functional with the extension absent. Record browser compatibility and actual tested limitations; do not claim extension functionality from the planning captures alone.
