# Gemini implementation — 12 September 2026

## Current status

All three application paths are implemented: PDF-to-draft, assisted eligibility review, and semantic opportunity matching. The production app builds. **The key is now configured and bounded live Gemini checks pass.** The initial key-less implementation used isolated stubs; live verification followed after the user added the key. Browser tests use a deterministic provider only in a fresh, guarded test database; it cannot run in the configured demo database. No generated fixture data was inserted into the demo catalogue.

The data remains an Indian ISRO snapshot. AI does not create a live feed, discover amendments, establish qualification, or submit bids. No deployment or monetization was added.

## Configuration and first real run

Preserve existing `.env.local`. Add `GEMINI_API_KEY` there, never in a browser variable or chat. Optional settings are documented in `.env.example`; generation defaults to `gemini-3.6-flash`, embeddings to `gemini-embedding-2` with 768 dimensions. The SDK is `@google/genai`. Restart the local server after changing configuration.

```sh
npm run ai:check
npm run dev
```

`ai:check` checks model lookup and an actual generation token-count preflight, without generating content. It does not establish your project's quota, billing tier, data-use terms, or future model availability. The user confirmed Gemini free tier; only public or non-sensitive demo inputs are authorized. Default to public/non-sensitive capability text and documents; the application asks for consent before sending selected input. Financial facts, contacts and bid notes are excluded from model input automatically. Selected project descriptions can contain sensitive text, so selection matters.

After configuring the key, run `npm run test:ai:live`. It requires the ignored `.local/ai-catalogue-review.json` produced by catalogue preparation, with a reviewed public document. It checks public-document extraction, citation validity, qualitative response shape, a laboratory-vs-civil semantic comparison and grounded explanations. Its report is `.local/ai-live-report.json`. This is a smoke/quality check, not an exhaustive evaluation of procurement accuracy. Do not mark live validation complete until you inspect the report and actual outputs. The CLI shares the application's project allowance and can consume Gemini quota.

## Demo flow

1. In Company profile, save an **AI-shareable capability profile**. Optionally add project scopes and explicitly select those permitted for AI review. Real audited financial/certificate checks remain local.
2. Open a tender and click **Analyze documents → Read document**. Supported official ISRO PDFs are fetched, text extracted in an isolated PDF.js worker, and retained privately with source URL, hash, timestamp and page ordinals. Unsupported or inaccessible URLs have a manual PDF upload fallback.
3. Select pages, approve sending that text, then **Analyze with Gemini**. Requests run in bounded sections. Completed sections are cached for resume; Stop prevents subsequent sections and does not guarantee cancellation of an already billed call.
4. Inspect exact source excerpts. Select suggested facts and requirements, confirm source review, then save private findings. Shared snapshot facts are preserved. Conflicting references/deadlines/amounts are shown and prevent confident confirmation/matching publication. To resolve a conflict, review the originals and revise the selected private findings; there is no automatic official-record rewrite.
5. In Eligibility, run **Review eligibility with AI**. Model evidence suggestions sit beside local rule outcomes. Missing evidence, unconfirmed/complex conditions and failures cannot become an AI pass. Record a separate human judgment and evidence reference if needed. It does not override a hard numeric/expiry failure. Stored AI results and human judgments become stale when relevant inputs change.
6. Choose **Use reviewed scope for matching**, or use the prepared public scopes. Open **AI recommendations → Find semantic matches**. The app prepares missing embeddings, ranks described notices, then requests grounded explanations for at most five results. Relevance is not eligibility or win probability. State/category filters and active-status restrictions apply; ordinary discovery includes reference-only notices.
7. Existing private PDF import also offers AI suggestions after browser text extraction. Applying suggestions populates a draft form; the existing reviewed import confirmation is still required.

## Real matching coverage

Nine official PDFs were retrieved and inspected on 12 September 2026. One of ten attempted sources timed out and was skipped. Nine exact scope excerpts are retained in `data/public/isro-matching-scopes.json`, with URL, page, retrieval date, document hash and snapshot-content hash. They cover garden/nursery maintenance, GNSS receivers, shamiyana hire, a spectrophotometer, RFSoC board, waveguide rotary joints, EPC building works, canopy/UPS-room construction and software test-tool renewal.

These nine profiles overlap one of the existing two enriched notices, giving **ten distinct described notices** in the current demo catalogue. The UI calculates eligible coverage dynamically; expired/filtered notices drop out. The other reference-only notices are still available through ordinary discovery. Scope excerpts do not certify completeness of specifications or update advertised deadlines, values, or lots.

To restore matching scopes into a new database after importing the original snapshot:

```sh
npm run ai:prepare-catalogue -- --import-reviewed
```

This reuses the dated repository artifact and checks source identity/content. It does not fetch fresh documents or call Gemini. Changed/missing snapshot records are skipped.

For additional source preparation:

```sh
npm run ai:prepare-catalogue -- --dry-run --limit 10
npm run ai:prepare-catalogue -- --limit 10
# Inspect .local/ai-catalogue-review.json; choose exact work-scope text,
# set reviewedText and reviewed=true only after reviewing the source.
npm run ai:prepare-catalogue -- --publish-reviewed
```

Preparation resumes already retrieved records. Public PDF retrieval and text extraction do not require Gemini. Public scope publication is an operator CLI function; ordinary app users publish only private matching profiles.

## Implementation boundaries

- `src/lib/ai`: Zod contracts, prompts, grounding, document fetch/extraction, provider, persistent cache/leases/allowances, orchestration and isolated test provider.
- `src/app/api/ai/route.ts`: authenticated, origin-checked, size-limited, private/no-store API. No provider key or SDK response is exposed to the browser.
- `src/components/ai-*`: document/draft review, import assistance, company evidence selection, matching and human judgments.
- `scripts/ai.ts`, `scripts/pdf-extract-worker.mjs`: operator tooling and bounded server PDF extraction.
- New Atlas collections: `aiDocuments`, `aiCatalogueDocuments`, `aiDrafts`, `aiChunks`, `aiFindings`, `aiProfiles`, `aiEligibility`, `aiJudgments`, `aiMatches`, `aiCache`, `aiLeases`, `aiBudget`, `aiUsage`. Existing private reviews keep accepted requirements; no model-generated edits to shared tenders.

Document retrieval allows only HTTPS `www.isro.gov.in/media_isro/pdf/Tenders/*.pdf`, rejects redirect/query/encoded traversal destinations, resolves public IPv4 and pins the connection address. File size is 20 MB; extraction caps are 250 pages, 25,000 characters per page and 700,000 per document, with worker timeout/memory bounds. Scanned text is not OCRed. Selected analysis is at most 30 pages / 120,000 characters / 12 chunks, with adjacent 800-character context. Citations use normalized exact substring matches; this verifies provenance, not the semantic truth of a model interpretation.

Generation requests are capped at 12,000 input and 4,000 output tokens, with bounded thinking where supported. Defaults: 30 generation attempts per project/day, at most 20 per user/day, 200 embedding items/project/day, one active provider request globally. MongoDB transactions reserve allowances before dispatch; identical calls share scoped content/model/prompt cache keys. Attempts can consume allowance even if the provider fails. A cached result does not consume another model allowance. Transient generation failures retry once after a short delay; embeddings can be retried by rerunning preparation. There is no promise of exactly-once provider billing.

Usage records retain generation input/output/thinking counts, with content omitted. Embedding input usage is explicitly a character-based estimate; it is not an invoice. No invoice or monetary cost has been verified; failed diagnostics and successful test calls consumed application allowance. Free-tier limits are project-dependent. Application caps are not a provider spending cap.

## Verification and remaining limits

- TypeScript, ESLint and 46 unit tests pass.
- Production Webpack build passes with the worker traced into the API build.
- Production browser checks cover the draft/eligibility/matching journey, consent, source review, human judgment/staleness, shared-data preservation, cross-user isolation, repeated calls, concurrent deduplication and application quota rejection.
- Existing production snapshot/import/amendment journey and actual PRL PDF browser extraction pass.
- Actual secure retrieval and server PDF extraction were exercised on nine official documents, independently of Gemini.
- Live Gemini smoke checks pass: six retained source-backed items, valid citations, conservative cited eligibility findings, the expected laboratory-vs-civil semantic ordering, and one grounded match explanation. These establish working integration on these inputs, not general extraction or ranking accuracy.

The plan's broader adversarial/live quality matrix (scanned/encrypted/malformed multi-column documents, prompt-injection corpus, provider refusals/rate-limit variations, cross-language ranking and complete multi-lot extraction) is not fully exercised. Image-only PDFs require manual review. Private document text, cache and drafts persist in Atlas without a self-service deletion UI/retention scheduler. Large historical AI outputs still need pagination/pruning for sustained hosted use. The current state API strips full page text from lists, but returns bounded historical drafts.

No hosting/deployment validation was performed. The server worker, request durations and output tracing are verified for the local production build, not Vercel Hobby. Keep each analysis section as a separate request; reevaluate hosting limits before a deployment request.

This increment is uncommitted unless a later session explicitly commits it. Preserve `.env.local`, the demo database, reviewed scope artifact and new AI files when resuming.


## Live verification follow-up — 12 September 2026

After the user configured the key, real API calls exposed two compatibility issues that model lookup and stub tests could not detect:

1. `gemini-2.5-flash` remained discoverable but token counting returned 404 stating it was unavailable to new users and recommending `gemini-3.6-flash`. The default and example configuration now use 3.6 Flash, with low thinking. `ai:check` now performs token counting so it catches this restriction.
2. The full nested Zod JSON Schema returned a generic 400. A minimal schema worked. Removing string-only constraints was insufficient; simplifying the provider schema to structural types, required fields and enums resolved the error. All original string, numeric and array bounds are still validated locally with Zod before any output is accepted. `provider-schema.ts` preserves property names while simplifying constraint keywords, and has a regression test.

Official references: [3.6 Flash model](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash), [supported thinking levels](https://ai.google.dev/gemini-api/docs/thinking), [JSON Schema subset and complexity limits](https://ai.google.dev/gemini-api/docs/structured-output). The old plan's 2.5 Flash pricing example is historical and must not be reused for the new model.

The live check used the first two extracted pages of the public VSSC garden/nursery maintenance notice and a non-sensitive laboratory-supplier test profile. Five fields and one requirement survived grounding. Invalid date suggestions and an unsupported work-experience citation were rejected and recorded as warnings; do not present this as complete document extraction. The retained amount conversion (104.32 lakh → 10,432,000) and EMD (208,640) were checked against the source text. Missing PF/ESI evidence produced a cited needs-review finding. The scientific-equipment query ranked the laboratory scope above civil infrastructure (cosines approximately 0.881 and 0.716); those values are test comparisons, not confidence percentages. The explanation correctly identified the garden-maintenance opportunity as outside the laboratory supplier's scope.

The strengthened final run checks nonempty, correctly attributed eligibility and explanation responses, rather than accepting empty arrays. It reused completed extraction/embedding caches. Details are retained in ignored `.local/ai-live-report.json`; public catalogue metadata and actual company profiles were not changed. Live browser presentation was not separately automated with the real provider; the application/browser path is covered by isolated tests, while these checks exercise the actual provider/grounding path.


## Linked-document browser fix

A subsequent real-browser reproduction identified typed-array serialization at the web-runtime/worker boundary: a correctly downloaded PDF became a plain numeric-key object, which the worker converted into zero bytes. The transport now uses a size-checked base64 string envelope, then reconstructs bytes inside the isolated worker. Known retrieval/extraction failures surface their specific safe error messages. `tests/e2e/document-read.spec.ts` covers the linked official PRL PDF and a repeated cached read; it requires access to ISRO in addition to Atlas and does not call Gemini. The new PDF-worker unit cases bring the suite to 48 tests. Earlier upload/CLI tests had not exercised this web-runtime boundary.

## Citation identity follow-up

A real user draft revealed that passing the whole Mongo document exposed both `_id` and `id`. Gemini chose `_id` although the quotes themselves matched, so strict citation verification rejected every field. The model-facing extraction DTO now has just one canonical ID and an explicit citation rule; internal IDs, ownership and database metadata are omitted. The CLI uses the same input builder as the application. Two affected public-PDF drafts were rerun and saved, each yielding five accepted fields without unsupported-citation warnings. Exact-source checks were not weakened, and a separately invalid PRL deadline suggestion remains rejected. A regression test brings the unit total to 49.
