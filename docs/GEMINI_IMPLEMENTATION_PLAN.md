# Gemini implementation plan — BidDesk

Implementation status (12 September 2026): application paths are now built; live Gemini smoke checks now pass with 3.6 Flash after model/schema compatibility fixes; broader quality evaluation remains limited. See [implementation notes](GEMINI_IMPLEMENTATION_NOTES.md) for completed work, tests and limits.

Date: 12 September 2026. Status: **planned, not implemented**. User requested a one-pass plan for (1) PDF-to-structured-drafts, (2) AI-assisted eligibility, and (3) semantic opportunity matching using their Gemini API access.

This extends the existing working POC; it does not restart it. Snapshot acquisition remains the selected data mode. No live coverage, deployment, award feed, chat assistant or autonomous bidding is included in this increment.

## 1. Outcome and execution contract

Deliver one tested increment in a single focused implementation run, with internal checkpoints:

1. Open an existing tender → select **Analyze documents** → BidDesk retrieves its supported official linked PDFs → inspect draft fields and requirements with source-page excerpts → accept/edit selected suggestions → save a private review linked to that tender. Manual PDF upload is a secondary path for outside notices or failed retrieval.
2. Open a tender → select **Review eligibility with AI** → see rule results, qualitative evidence comparisons, missing information and source references; revise the company evidence and rerun without stale results appearing current.
3. Open **Recommended for you** → rank sufficiently described visible opportunities by semantic fit to a reviewed company capability profile → see concrete reasons and gaps, while keeping relevance separate from eligibility.

The existing manual/rule-based workflows continue to work without an API key, during quota exhaustion, or after a provider error. Preserve Atlas configuration, public source records, private ownership, version history, task references and current build setup. No additional commit/push is implied by this planning request.

## 2. Decisions that keep the work bounded

| Concern | Planned decision |
| --- | --- |
| SDK | Official `@google/genai`, installed and locked during implementation; wrap behind a small provider interface |
| Generation | Initial configurable default `gemini-2.5-flash` for extraction, qualitative review and short matching explanations |
| Embeddings | Initial configurable default `gemini-embedding-2`, text-only, 768 dimensions; server-side cosine ranking over the current small catalogue |
| Output contracts | Gemini JSON-schema structured output plus independent Zod/business validation |
| PDF input | Fetch supported official linked PDFs server-side and extract page text with PDF.js; retain browser PDF.js for manual uploads. Send bounded page-tagged text to Gemini |
| Storage | Existing Atlas, with separate derived-analysis/embedding collections; no vector service or external job queue |
| Invocation | Explicit user actions; no AI call on ordinary page loads or every keystroke |
| Cache | Atlas application cache keyed by exact input hashes, model, prompt/schema version and owner |
| Processing | Bounded synchronous requests, resumable page batches controlled by the client/local CLI; never unawaited work after an HTTP response |
| Retrieval scope | Authorize and filter candidates before similarity scoring or prompt construction |
| Existing catalogue | Bounded preparation of selected snapshot PDFs; no scheduled source discovery |

Check model availability and capabilities with the actual project during implementation. Access to a Gemini key does not establish access/quota for every model. Fail clearly for unavailable models; do not silently move to a more expensive model. If a default is unavailable, choose a documented compatible alternative explicitly and record it in configuration and verification notes.

Google documents structured JSON output and its JavaScript SDK, PDF understanding and embedding support. Structured output constrains shape, not factual correctness. [Structured output](https://ai.google.dev/gemini-api/docs/structured-output), [document understanding](https://ai.google.dev/gemini-api/docs/document-processing), [model catalogue](https://ai.google.dev/gemini-api/docs/models), [embeddings](https://ai.google.dev/gemini-api/docs/embeddings).

## 3. Configuration, data handling and cost defaults

Add examples to `.env.example`; never overwrite existing `.env.local` or request a secret in chat:

```dotenv
GEMINI_API_KEY=
GEMINI_GENERATION_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
BIDDESK_AI_ENABLED=true
BIDDESK_AI_DATA_MODE=public-demo
BIDDESK_AI_GENERATION_CALLS_PER_DAY=30
BIDDESK_AI_EMBEDDING_ITEMS_PER_DAY=200
BIDDESK_AI_CONCURRENCY=1
```

- These are proposed application caps, not claims about Google's quota. Make caps server-controlled, persisted and atomic across users/processes. Add a modest per-user request limit and one active operation per user; CLI preparation shares the same project budget.
- API key and provider implementation are server-only; browser calls our authenticated endpoints. Never accept arbitrary model IDs, prompts, owner IDs, document URLs or credentials from client parameters.
- Default `public-demo` mode allows only public/non-sensitive inputs for provider processing. Keep private financial calculations local. Let the user compose a separate AI-shareable capability/evidence selection; do not automatically send their full company profile, contacts, task notes or bid strategy.
- Before an explicit AI action, clearly identify what text/evidence is sent to Gemini. An API access setting must not be mistaken for permission to transmit every stored private document.
- The user's free-vs-billing-enabled tier is pending clarification at planning time. Continue with public/non-sensitive demo data if unresolved. Confidential evidence processing requires an appropriately configured account/data mode; do not silently enable billing or change Google's settings.
- Google states unpaid-service content may be used for product improvement and says not to submit sensitive, confidential or personal information. Paid-service data handling differs. This is directly relevant to company evidence and uploaded tenders. [Gemini terms](https://ai.google.dev/gemini-api/terms).

Cost controls: count tokens before generation, cap each request at 12,000 input tokens and 4,000 output tokens, use a bounded supported thinking budget, record actual input/output/thinking usage without content logs, and reserve budget before dispatch. Retry transient 429/5xx responses at most once with backoff/Retry-After, within the cap. Never retry authentication, validation or blocked-content errors automatically. Count possible charged attempts after ambiguous timeouts conservatively; the provider does not offer our application's exactly-once billing guarantee.

Prefer application caching over Gemini's paid explicit context-cache service for this small demo. No Google Search grounding, Files API storage or third-party AI service is required.

Illustrative paid usage at the prices checked on 12 September: 500,000 generation input tokens + 100,000 billed output tokens (including thinking) + 100,000 text embedding tokens would be about **$0.42** with the proposed models ($0.15 + $0.25 + $0.02), before tax. This is an example workload, not a measured implementation budget or spending authorization. Eligible free-tier calls may incur no API charge, subject to actual project quotas. Exact cost is reported from measured usage, with unknown pricing shown as unknown. [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing).

## 4. Source quality before semantic matching

Most of the 77 current notices have reference-based titles and generic descriptions. An embedding of a reference number will not create knowledge of the work. Treat this as a data gate, not a prompting problem.

- Add a local `ai:prepare-catalogue -- --limit 10` command, with dry-run listing and resume support. Use only documents already linked from the saved snapshot and explicitly supported public sources.
- Target 8–10 successfully text-extracted, varied existing notices, including SAC lab 5154 and PRL RFSoC. Validate actual scope excerpts and record document URL, content hash, document retrieval time and pages processed. This is bounded enrichment, not live coverage.
- Constrain fetches to the verified official host/path allowlist, reject unexpected redirects, limit size/time, and never fetch arbitrary private URLs from a user action. Keep downloaded binaries local/ignored. If access fails, accept a locally downloaded official PDF instead.
- A trusted local preparation command can publish derived public text/profile metadata; normal account-triggered analysis stays owner-scoped. Do not overwrite canonical shared tender facts with unreviewed AI output.
- Before trusted publication, provide a reviewable report of extracted scope and citations. Automation may mark candidates ready for review, but cannot claim human verification. In the implementation rehearsal, review the bounded sample against originals.
- Retain the original listing retrieval time. A document fetched today is a separate observation, not proof that every old listing field is current. If the document differs materially from the snapshot, preserve/report that discrepancy and require explicit reconciliation before using conflicting terms.
- Mark remaining records **Insufficient description for semantic matching** and keep them searchable through existing filters. Show recommendation coverage, e.g. “10 described notices ranked out of 77 visible notices.” Report the actual number, even if the target cannot be met.

## 5. Shared data contracts and migration

Add optional fields with defaults; legacy records must continue to parse without reseeding or destructive migrations.

| Contract/collection | Essential fields and rules |
| --- | --- |
| Source document/page | Stable document ID, SHA-256, page ordinal, normalized text, source URL, text quality, source retrieval time; PDF page ordinal distinct from printed page label |
| Citation | Document ID/hash + page ordinal + verbatim excerpt; normalize whitespace for validation, retain the original excerpt |
| Extraction draft | Owner, source hash, input revision, draft fields with citations, draft requirements, warnings, processed/omitted page ranges, model/prompt/schema versions |
| Requirement provenance | Optional citations, origin manual/AI-assisted, confirmed=false for new AI candidates, complex-condition flag; server-generated stable IDs |
| Company evidence | Existing facts plus optional structured projects (stable ID, scope, completion date, amount/currency if supplied, evidence reference); separately selected AI-shareable snippets |
| Eligibility analysis | Owner, tender version, document/requirement/company/evidence hashes, rule outcomes, AI suggestions with evidence IDs/citations, merged outcomes, coverage and generatedAt |
| Matching profile | Tender scope/products/services extracted from actual source text, provenance/quality; company shareable capability text keyed independently from financial details |
| Embedding | Owner/public scope, entity ID, text hash, model, dimensions and vector; never compare different embedding model spaces |
| AI operation/cache | Unique scoped cache key, type, state, input hashes, lease/expiry, usage, safe error code and validated result reference |
| Usage counters | Atomic day/user/project reservations, dispatched attempts and actual token/item usage; never log raw prompts or evidence |

Create unique cache/index keys and supporting owner/entity/hash indexes. Return result summaries to workspace reads; fetch large page/citation payloads only on demand. Do not add vectors, raw prompts or all analyses to the existing workspace JSON response.

Avoid losing provenance in `tenderSchema.parse()` during saves/versioning. Apply compatible schema changes to manual imports, reviews, versions and exports. Keep existing requirement IDs on edits; never remap amended requirements by fuzzy label similarity without review. Existing `createBid` only consumes user-confirmed requirements; keep that invariant.

## 6. Feature A — PDF to structured drafts

### Primary flow: analyze a tender already in BidDesk

1. Place **Analyze documents** on tender detail and in its Documents tab. Show the stored document list with names and source links; select documents when several exist. No manual download/re-upload is required for supported links.
2. The browser sends the tender ID, expected version and stored document IDs. The server checks visibility, resolves the existing links and retrieves supported PDFs. Extract readable page text with the Node-compatible PDF.js build; report unreadable pages and fetch failures. Reuse the same page/citation contracts as the browser upload path.
3. Show the retrieved documents, retrieval time, readable/omitted pages and Gemini input summary. The analysis action follows the configured data-sharing policy. Repeated analysis reuses stored extracted text/results for the same content hash; **Check source again** explicitly re-fetches the document rather than implying an automatic freshness check.
4. **Analyze with Gemini** uses the selected documents/pages. Proposed per-run limit: 30 pages / 120,000 characters, within existing upload limits. Larger documents use additional explicit runs.
5. Split selected text into bounded chunks with full document/page IDs. Keep page/paragraph boundaries where possible and provide adjacent overlap for split clauses. Limit to 12 generation calls per analysis; refuse oversized selection before provider dispatch. Persist completed chunks for resume.
6. Gemini returns nullable metadata and requirement candidates with citations: title, authority, references/lots, work location, dates and their meaning/timezone, amounts/currencies, scope, eligibility clauses and unresolved alternatives.
7. Validate JSON and source excerpts. Flag conflicting dates/amounts, multiple lots and ambiguous financial formulas rather than selecting a convenient value. Preserve AND/OR/exception wording in complex clauses; map to manual review when existing rule types cannot represent it faithfully.
8. Show suggestions alongside current fields. User accepts/edits individual fields and requirements. Never overwrite edits made while analysis was running; reject applying a stale draft revision.
9. Accepted AI requirement candidates remain unconfirmed until reviewed against the cited source. Store analysis and reviewed findings privately against the original tender/document version; do not create a duplicate tender just to analyze it. Use the existing private requirements/review path. Add a scoped derived-field record for suggested scope/metadata rather than overwriting the shared catalogue. Canonical source fields and private findings must be distinguishable wherever displayed.
10. A conflicting submission deadline, amount or lot cannot silently override canonical tender values or feed a mixed-version eligibility assessment. Show the conflict and require explicit reconciliation (trusted catalogue update or deliberate private amended copy) before dependent calculations treat it as current.

### Retrieval implementation and fallback

- Ship the first fetch adapter for stored `https://www.isro.gov.in/media_isro/pdf/Tenders/` document links. Verify the actual supported path patterns during implementation. Never expose a general-purpose URL-fetch endpoint.
- Validate scheme, host, port and path server-side, reject credential-bearing URLs and redirects, and reject private/loopback/link-local destinations. Pin the allowed resolved destination or otherwise prevent DNS rebinding between validation and connection. Document IDs and owner information supplied by the browser do not substitute for server authorization.
- Enforce timeout, streamed byte limits (20 MB per PDF), PDF signature/content checks, page/text limits and per-action limits before analysis. Propose at most three selected documents per fetch action, sequentially, with an aggregate 40 MB download limit. Show per-document failures and partial coverage.
- Process PDFs in a bounded worker with a timeout and clean up temporary binaries. Persist scoped extracted text/hash/source provenance in Atlas, not a dependence on persistent server files. Keep large extracted-page payloads out of ordinary workspace responses.
- Unsupported sources, login/CAPTCHA pages, oversized files and unavailable PDFs produce a clear explanation plus **Open official source** and **Upload a PDF instead**. Do not bypass access controls or treat HTML/error content as a tender document.
- Manual upload remains available under Import a tender and as a fallback on an existing tender. When attaching a local PDF to an existing tender, the user confirms the association; retain its local-upload provenance and do not claim it was fetched from the official URL. Use the same review/analysis flow after browser extraction.
- On-demand retrieval of an existing document is not live tender monitoring. Keep listing timestamps, document retrieval timestamps and analysis timestamps separate.

### Grounding and scope rules

- Every proposed critical field and requirement needs at least one valid excerpt/page; unsupported claims are dropped or retained as visibly unsupported suggestions, never accepted silently.
- Dates distinguish notice date, download window, submission deadline and opening time. Currency/units and lakh/crore conversions must agree with the source; never fill absent amounts with zero.
- Text excerpt existence is necessary but not sufficient for correctness; users still review interpretation. Cross-page clauses and tables get explicit warnings where structure is lost.
- Detect empty/scanned or mixed poor-text pages. This increment uses extracted text, so image-only conditions are not analyzed; show omitted/low-quality pages. Native multimodal PDF/OCR may be a later enhancement, not a silent fallback.
- All successful outputs display scope (“pages 1–8 analyzed”, etc.), not “entire tender reviewed” unless the complete readable input was processed. Even full processing does not imply complete legal/eligibility coverage.
- Document text is untrusted input: instruct extraction only, no tools/web execution, ignore embedded requests to change instructions or reveal secrets. Output never controls network destinations or database ownership.

Gate: a real PRL PDF produces the RFSoC/GeM reference and due-date draft with valid page references; the SAC PDF captures published financial fields and preserves the complex experience alternatives as review-required.

## 7. Feature B — AI-assisted eligibility

### Evidence-first workflow

- Keep `assess()` as the arithmetic/date baseline. Gemini receives reviewed requirements, relevant source excerpts, selected company evidence with stable IDs and rule outcomes.
- Gemini adds concise qualitative comparisons: related experience, scope alignment, certificate-name ambiguity, missing proof and unresolved exceptions. Return only brief evidence-based explanations and next actions, not hidden reasoning traces or a global qualification promise.
- Each suggested result cites an existing requirement ID, actual source text and valid selected company evidence IDs. A reference label such as “audited accounts” does not mean the app has verified the underlying accounts.
- Add a compact project-evidence editor to Company profile so experience review has more than an undifferentiated paragraph. Existing free text remains supported as user-declared evidence, labelled accordingly.

### Final outcome policy

| Situation | Displayed outcome |
| --- | --- |
| Missing evidence, unconfirmed requirement, invalid citation or incomplete condition | Needs review |
| Supported exact numerical/date rule passes and no unresolved contradiction | Appears satisfied; show rule/evidence |
| Supported exact numerical/date rule fails | Not satisfied for that requirement; an alleged AI exception triggers review, never an automatic pass |
| AI sees qualitative supporting evidence without a complete supported rule | AI suggests supporting evidence; needs review until the user records a sourced judgment |
| AI and rule interpretation conflict, or alternatives/exemptions are unresolved | Needs review; show both findings |
| Model failure/quota exhaustion | Preserve existing rule results and label AI unavailable |

A human qualitative judgment must be stored with its evidence/input hashes and become stale when those inputs change. Do not report an overall “eligible” badge or win probability. Report reviewed requirement counts, outstanding checks and document coverage instead.

Invalidation: tender version, cited document hash, requirement content/confirmation, selected evidence or company facts change → old AI review becomes stale. Include the relevant assessment date in cache validity for expiry rules without an exact tender deadline. Old results remain auditable but cannot appear current. Reopening tasks from imported source changes continues to use existing version/requirement logic; AI must not silently complete tasks or reinterpret stable requirement IDs.

Gate: company facts alter the assessment; absent evidence never passes; threshold/expiry failures cannot be overridden by a persuasive model response; changed source/profile invalidates cached judgments.

## 8. Feature C — semantic opportunity matching

1. Build a concise, user-reviewed AI-shareable company profile from products/services, capabilities and selected project scope. Exclude private financial values, personal identifiers, evidence secrets and bid notes from embeddings by default.
2. Build tender text from actual scope/category/source excerpts, not the generic listing boilerplate. Skip records lacking useful descriptions; preserve quality/source indicators.
3. Embed once per normalized text hash/model/dimensions. With Embedding 2, use compatible retrieval instructions for company query vs tender document text; verify SDK multi-item response cardinality instead of assuming each string yields a separate vector. Never mix model spaces after a model change.
4. Authorize public-plus-own records and apply explicit user hard filters first. Default recommendations use active/upcoming notice windows; this is the existing date-derived snapshot status, not live source verification. Region preferences can be soft unless the user selects a hard filter.
5. Rank the bounded candidate set with server-side cosine similarity. Cap at 2,000 records and surface that scope; no Atlas vector index required for this dataset. Hidden/private records never reach scoring or Gemini.
6. Generate concise reasons/gaps for the top five candidates in one bounded generation request using their actual source snippets and the shared capability profile. Validate returned IDs/citations; discard invented candidates. Keep numeric rank deterministic from similarity, with labelled high/medium/low fit calibrated on evaluation examples rather than percentage odds.
7. Add a Recommended view/sort to Discovery and an Overview card. Include “Why this matches”, “What still needs checking”, document quality, source freshness and eligibility state separately. Apply the same authorized ranking/filtering to pagination and exports if recommendations are exported.
8. On an embedding/provider failure, offer existing keyword matching labelled as such. Do not silently relabel keyword results as AI results. Cached rankings/explanations invalidate on company profile, tender content, candidate set, filters, model or prompt changes; expired tenders are removed on read.

Gate: a capability profile finds meaningfully related work with different wording, excludes unauthorized records and hard-filter failures, and does not manufacture matches for reference-only notices. Matching is relevance, not a claim that a firm can legally qualify or will win.

## 9. API and failure handling

Add a dedicated authenticated `/api/ai` route (or small typed routes) rather than growing every AI action into the existing generic data handler:

- `status`: availability, safe model labels, user allowance and processing status; no provider request or secrets.
- `retrieve-documents`: tender ID + expected version + stored document IDs; authorize and resolve supported official URLs server-side, fetch/extract within limits, and return scoped document handles and coverage.
- `extract`: scoped retrieved-document handle or validated manual page input, draft revision and selected pages; derive hashes/owner on the server.
- `eligibility`: tender ID + expected current version + selected evidence IDs; server loads authorized facts.
- `prepare-matches`: prepare missing bounded embeddings for visible, permitted inputs, return progress/resume IDs.
- `matches`: serve cached/server-ranked results; explicit action generates missing AI explanations.
- `result`: scoped cached result/progress; read-only, no hidden paid calls.

Enforce session, origin, JSON and byte limits (retain at most 2 MB transport); additionally enforce token/page/item budgets. Use private/no-store responses. Use MongoDB leases and unique keys to collapse concurrent identical requests; handle abandoned leases and safe resume. Validate document/evidence versions again before attaching a result; concurrent edits should return a stale result state or 409 rather than clobbering current work.

Per-request provider timeout around 40 seconds; long documents use explicit successive chunk requests and CLI processing. User cancellation stops future chunks and attempts to abort the current request, but cannot guarantee the provider did not already bill it. Persist validated completed chunks and usage. Do not promise exactly-once provider charging or provider-side cancellation.

Safe errors distinguish missing key, inaccessible model, quota limit, app budget reached, timeout, provider refusal, invalid response and stale inputs. Avoid raw SDK errors that might contain prompts or credentials. Preserve manual workflows throughout.

## 10. Build order and files

| Checkpoint | Work |
| --- | --- |
| A — contracts/provider | Add optional provenance/project schemas, AI schemas, provider wrapper, server configuration/capability check, budgets, cache/lease indexes and test stub |
| B — source grounding | Official-link retrieval adapter, bounded server PDF extraction, stable document/page identities, excerpt validation, chunking/coverage and extraction endpoints |
| C — analysis UX | Tender-detail Analyze documents as the primary path; scoped findings, source conflicts and manual-upload fallback; review/apply without overwriting edits |
| D — eligibility | Company evidence selection, hybrid merge policy, sourced AI review UI, version/hash staleness and explicit human judgment |
| E — matching | Bounded source-text preparation, embeddings/cache, authorized filtered ranking, explanations and recommendation UI |
| F — rehearsal | Real-source extraction checks, independent matching/eligibility cases, quota/error/privacy tests, production build/browser run and updated docs |

Suggested modules: `src/lib/ai/{provider,schemas,prompts,grounding,documents,cache,budget,eligibility,matching}.ts`, `src/app/api/ai/route.ts`, `src/components/ai-*`, and `scripts/ai.ts`. Modify current imports, tender-detail, company, discovery/overview, schemas, indexes and version/review paths as needed. Reuse the existing auth, MongoDB pool, PDF.js worker, schemas, styling and test infrastructure. Do not add agent frameworks, orchestration services or an unrelated chat UI.

Expose `npm run ai:check`, `npm run ai:prepare-catalogue -- --limit 10`, and `npm run test:ai:live` with clear help and safe output. Ordinary tests must not call Gemini or spend quota; live evaluations require the actual key and an explicit command.

## 11. Acceptance and evidence

### Deterministic tests

- Retrieval: stored-document ownership, unsupported hosts, redirects, private destinations, wrong content type/signature, oversized/chunked responses, timeouts, repeated-fetch cache behavior and partial document failure.
- Zod/provider response validation; nonexistent pages/quotes/evidence IDs rejected; malformed/truncated output never saved as confirmed facts.
- Currency, deadline-type and complex-OR-clause preservation; blank/mixed-text PDFs and partial processing are labelled.
- Exact threshold/expiry checks, missing evidence, conflicting AI conclusions and stale judgments.
- Stable requirement IDs across review/amendment; no duplicated bid tasks when applying/retrying a draft.
- Cache invalidation, concurrent request deduplication, budget reservations, retries/timeouts and cancellation/resume.
- Two-user isolation across page text, analysis results, evidence, vectors, recommendations and exports.
- Prompt-injection fixture cannot alter ownership, confirmed flags, network access or final eligibility policy.
- Ranking/filtering, embedding dimension/model mismatch, insufficient descriptions, empty company profile and fallback labelling.

### Live Gemini evaluation

- Open the existing PRL RFSoC and SAC 5154 tenders and retrieve/analyze their linked official PDFs without a manual upload; check the output against hand-checked key fields. Separately rehearse manual upload as the fallback. Mandatory sampled fields/citations must be correct; missing values stay null. Report extraction coverage and omissions, not just successful JSON parsing.
- Evaluate qualitative evidence against a small hand-labelled set: clearly relevant project, superficially similar but incompatible project, missing evidence and an explicit rule failure. Use non-sensitive test profiles, never fictional tender records in the public catalogue.
- Check matching across 8–10 real described notices with at least three deliberately different capability profiles. Prepare expected relevant/irrelevant pairs before tuning; include held-out synonym/irrelevance cases. Record top-result relevance, not a claim of generalized model accuracy.
- Record actual model IDs, dates, prompt versions, calls/tokens, latency, failures and estimated charges. Replaying cached requests must avoid additional provider calls.
- Treat quota/model access failure as an external test blocker; finish independent work but do not call the live integration verified without a successful real call.

### Browser and regression acceptance

Run TypeScript, lint, existing unit/production browser journeys and new stubbed AI journeys. Rehearse open existing tender → retrieve linked documents → analyze → review → save private findings → eligibility → company edit → stale/rerun → recommendations. Also demonstrate the app without a key and with quota exhaustion. Use the isolated Atlas test database; preserve the demo database and existing accounts. Maintain the working Webpack production build.

Deliver code/lockfile, configuration examples, updated README/source/verification/demo notes, live evaluation report and continuity notes. The demo should explain which content came from AI, which facts a user confirmed, how evidence is cited, what was not analyzed and how much source material supports recommendations.

## 12. Planning status and continuation

Only this plan and continuity pointers are being saved now. No Gemini package installed, key read/changed, provider call made, billing enabled or company/document data transmitted during planning.

Before the implementation run: supply `GEMINI_API_KEY` privately in `.env.local`; establish free vs billing-enabled project/data mode and any spending limit. Absence of those details does not block offline implementation, but it limits live verification to available authorized inputs/quota. The user has been asked about tier; until answered, the plan defaults to public/non-sensitive demo inputs.

This plan supersedes the old “no AI inference” design choice only for the three requested AI features. It does not supersede the existing snapshot-only data acquisition decision.

### Accepted workflow correction

The user clarified that analysis should begin with documents already linked to a tender. **Open tender → Analyze documents** is the primary workflow; manual upload is secondary. This correction is part of the planned increment, not an implemented feature yet.
