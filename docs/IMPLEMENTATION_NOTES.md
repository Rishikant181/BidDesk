# Implementation notes

## Product direction — 12 September 2026

**TenderHut is the only tender source.** Nothing has reached production or been finalized. The user explicitly directs that every iteration be treated as fresh, with no backward-compatibility requirements. Do not restore alternate sources, standalone tender imports, manual award feeds or migration layers from Git history.

Read [TENDERHUT_IMPLEMENTATION_NOTES.md](TENDERHUT_IMPLEMENTATION_NOTES.md) for the current code map and limits and [UI_FUNCTIONALITY_AUDIT.md](UI_FUNCTIONALITY_AUDIT.md) for the earlier audit and current disposition.

## Hosted Chrome extension URLs — 13 September 2026

Chrome bridge 0.3.0 accepts canonical HTTPS pairing destinations and retains HTTP localhost development. The popup requests optional host access only for the inspected site from the transfer click; the worker checks permission before downloading any source data. Editing the code clears the destination, denied permission prevents transfer, and site access is not granted globally at installation. The server pairs/transfers only at the exact origin configured in `BETTER_AUTH_URL`; remote HTTP, malformed configuration and other request origins are rejected. Forwarded headers are not used to select a destination. One-use owner/tender/version grants and browser-only TenderHut credentials are preserved. Non-JSON host errors, including oversized uploads, now produce readable extension errors.

The downloadable ZIP, setup UI and current deployment instructions are updated. Set the exact production HTTPS origin in Vercel's `BETTER_AUTH_URL`, redeploy the code, replace the extracted extension files and Reload in `chrome://extensions`. No actual domain or private environment configuration was changed. This supersedes the earlier local-only URL restriction, not the filesystem/runtime limits: `.local/attachments` and private original PDFs still need persistent storage, and Vercel's 4.5 MB payload limit still requires a different upload/storage implementation. Hosted transfers are not claimed operational on Vercel.

Verification: the 84-test suite passed before the final popup test was added; all seven focused extension/origin tests then passed (85 total test cases in the suite). Typecheck, lint and production build pass. The initial sandbox build could not parse TypeScript subprocess output; the build succeeded outside the sandbox. The packaged Chrome service-worker browser journey passed against the isolated local production app, including grant replay rejection. HTTPS destination permission/validation and denial/retry are tested with mocked Chrome APIs; a real hosted permission prompt and authenticated live TenderHut transfer still need manual verification. No deployment was performed.

## Bid-only information and single-requirement rechecks — 13 September 2026

Eligibility now provides Add missing information / Edit bid-only information on each requirement. Enter details, optionally attach a readable PDF, then use Save & recheck this requirement. Information is private to the owner, tender and requirement, including before a preparation workspace is created; it is never copied into the company profile or another requirement. Turnover and certification requirements expose bid-only financial period/amount or certificate-expiry fields. The form protects unsaved edits, supports replacing/removing an attachment reference, displays save/check progress and errors, and allows retry without re-entering saved information.

`bidRequirementInformation` retains the input, PDF reference and bounded extracted text, optimistic revision, and the latest requirement assessment. Full eligibility snapshots remain separate; targeted checks overlay only their requirement. Scoped hashes cover that requirement, relevant tender documents, company facts, bid-only input/file availability, date and AI configuration. Input revisions enforce concurrent-edit safety while unchanged-value retries do not invalidate assessments solely because a revision counter changed. Other eligibility results and human assessments retain their prior state. Bid decisions become stale when relevant bid-only inputs change. A full eligibility check includes each requirement's saved evidence and refreshes its scoped result.

Input saves happen before PDF reading and AI generation. Extraction/quota/provider failures return the saved revision and leave only the edited requirement awaiting a fresh check. A concurrent newer input cannot be overwritten by an older result. Company evidence and exact tender citations are still validated; additional evidence IDs are accepted only for their own requirement. Structured bid-only figures/certificate facts participate in local checks and do not alter shared company facts or override failed thresholds. File ownership and availability are checked. Uploaded PDFs use the existing private file store; readable excerpts are limited to 20,000 extracted characters, with the existing 20 MB/PDF upload limit. PDFs with unreadable pages must be replaced with a readable excerpt. Detaching an attachment does not delete a file that might be referenced elsewhere.

The form explicitly discloses that entered details and attached readable PDF text are sent to AI for the targeted check. This opt-in bid attachment path is distinct from reusable library evidence and acknowledgments, which are not automatically shared. No private configuration or actual company/bid data was modified during implementation. Existing Chrome work is preserved.

Verification: typecheck, lint, all 80 unit tests and the final production build pass. Nine affected browser journeys passed across the initial regression run and final targeted run. Coverage includes single-requirement provider calls, unchanged company/other requirement results and assessments, PDF save/reload/access, full-check reuse of scoped evidence, quota-failure persistence and inline retry, concurrent edit rejection, unreadable-PDF recovery, bid-only financial thresholds and proof removal. Desktop/mobile forms were visually inspected and mobile overflow checked. Tests use isolated databases and deterministic source/AI fixtures; no live model quality or deployment claim is made.

## Separate company supporting information — 13 September 2026

Company profile now has its own Supporting information panel and 6,000-character input for contact numbers, service-support arrangements, locations and company declarations. It saves as `supportingInformation` through the company schema and participates in existing dirty-form protection and owner-scoped persistence. The form explicitly states that the information is shared with AI during eligibility checks. Capabilities and selected projects retain their separate inputs.

Eligibility includes this field as a separate `supporting-information` evidence item, accepts it even without capability text, and invalidates prior assessments when it changes. It is excluded from tender search planning, matching profile text and matching hashes. Private experience notes and structured financial facts retain their existing treatment. Existing capability prose is preserved; users can move their contact/declaration details into the new input. No private configuration or company data was modified during implementation.

Verification: typecheck, lint, production build and all 76 unit tests pass. The company-profile/eligibility browser journey verifies save/reload persistence, unchanged capabilities, separate supporting-information evidence IDs and mobile overflow; both AI journeys and the general UI workflow pass. The reload assertion was corrected to use the textarea’s accessible role/name. The mobile supporting-information layout was visually inspected. Tests use isolated fixture data.

## Resolve supported eligibility without manual assessment — 13 September 2026

Fixed the separate-status problem where the AI found supporting company information but Eligibility still required a manual assessment. Current, grounded supporting findings now resolve qualitative manual/experience/location requirements in the shared readiness calculation and AI eligibility result. The screen shows Appears met and retains preparation reminders, such as including your support number in the bid. Unknown importance alone does not block an already supported requirement. No human judgment is fabricated or stored.

Supporting results must reference actual supplied company evidence IDs and valid tender citations. Failed numeric checks, missing structured turnover/certification evidence, missing or expired linked evidence, stale AI results and current user-recorded gaps remain unresolved. A fresh supporting check can supersede a stale manual assessment. The AI instructions distinguish missing eligibility information from routine bid-document preparation, and require all material conditions to be addressed before returning supporting evidence. Existing assessments become stale from the instruction change; Check eligibility refreshes them. Internal grounding, private configuration and source data are preserved.

Verification: typecheck, lint, production build and all 75 unit tests pass. All six affected isolated browser journeys pass; the AI journey was rerun after fixing an assertion that also counted hidden dropdown options. Regression coverage includes automatic qualitative resolution, retained preparation reminders, actual company evidence IDs, numeric failures, missing/expired evidence, stale results and current versus stale user assessments. Browser integration uses deterministic AI/source fixtures; live model classification quality was not measured.

## Address the user as the bidder — 13 September 2026

AI instructions now establish that the reader is preparing their own company's bid. Generated requirement labels, eligibility explanations, gaps, matching explanations and next actions must use you/your/your company, with concrete actions such as preparing your self-undertaking. They must not tell the reader to request documents from the bidder. The prompt distinguishes the reader from buyers, other bidders and consortium partners, and preserves exact citations, factual field values and legal conditions. Built-in eligibility messages also address the reader directly.

Generation cache keys now include the actual system instruction, so a new request cannot reuse output generated under the old wording policy. Eligibility hashes also include the instruction, marking prior assessments stale without resetting PDF page coverage. Existing persisted prose is not mechanically rewritten: Check eligibility refreshes explanations/actions; Analyze PDF refreshes extracted requirement labels. No bulk live AI requests or private-data changes were performed.

Verification: typecheck, lint, 69 unit tests, production build and both isolated AI browser journeys pass. These verify application integration and caching, not live model wording quality.

## Automatic private findings and simpler eligibility — 13 September 2026

The user explicitly removed the human approval gate for private PDF findings. Analyze PDF now processes all readable pages in bounded batches, saves grounded fields and requirements on the server after each section, and displays Private findings immediately. No selection checkboxes, source excerpts, confirmation step or apply action remains. Results merge across current documents/batches, retries deduplicate requirements, and successful work survives a later failure. Document options contains optional page ranges, remaining-page analysis, original-page viewing, OCR and deletion. Existing Chrome extension work is preserved.

The extraction contract includes mandatory/optional/unknown importance based on document wording. Requirements are accepted automatically, but acceptance does not claim the company qualifies. Exact citations and content hashes remain internal for grounding, stale-input detection and public/private separation. Analyzed pages count toward readiness without setting human-reviewed flags. Conflicting document values remain blockers, including conflicts between documents when the listing has no value. Source-version changes do not automatically reconfirm manually entered requirements.

Eligibility now shows one plain result, explanation and next step per requirement. Source citations, clause/page fields and separate local/AI result lists are removed from that view. Requirement editing, preparation tasks and a single-note assessment form remain optional. Failed numeric checks, missing/expired evidence, ambiguous requirements and stale inputs retain conservative outcomes. This entry supersedes earlier notes requiring users to approve findings or manually review every analyzed page.

Verification: typecheck, lint, all 69 unit tests and production build pass. All eight affected production browser journeys pass after correcting the new Analyze PDF button to use the API’s readable-page metadata. The other five browser journeys passed in the preceding full-suite run, including the packaged Chrome extension. Tests cover automatic persistence without apply, two-document aggregation, deduplication on retry, reloads, account isolation, eligibility without source UI, failed numeric checks, interrupted long-document analysis, OCR and existing preparation workflows. Desktop findings and mobile eligibility layouts were visually inspected; the mobile test also checks horizontal overflow. Browser tests use an isolated database and deterministic source/AI fixtures; no live AI quality claim or deployment is implied. Private configuration is unchanged.

## Chrome attachment extension — 13 September 2026

Replaced the Firefox extension with Chrome Manifest V3 (minimum Chrome 120): a service worker, `chrome.*` APIs, explicit isolated-world download execution, asynchronous callback responses, and a bounded transfer keepalive. Sender, local destination, tender, size and single-use grant checks remain. TenderHut cookies/tokens stay in the browser. Popup controls now invalidate edited pairing codes, disable conflicting actions during requests and show asynchronous errors. No Firefox compatibility layer remains.

The Documents & review UI and current setup/source/workflow/deployment guides now describe Chrome, `chrome://extensions`, Developer mode and Load unpacked. The downloadable ZIP was rebuilt from the Chrome sources. Historical verification entries mentioning Firefox describe the superseded implementation. Extension transfer remains local-only; hosted support was not added.

Verification: typecheck, lint, all 67 unit tests and production build pass. The existing TenderHut attachment browser journey passes. A new browser journey loads the distributed ZIP as a real Chromium extension, exercises its popup and service worker, verifies cookie-backed fixture download/authentication, transfers bytes into the isolated BidDesk workspace, lists the received file, and rejects a reused grant. An initial test setup omitted tender discovery and was corrected before the successful run. Unit checks verify sender/destination restrictions, that upstream tokens are absent from the upload, and exact ZIP/source parity. Real authenticated TenderHut access/entitlement still needs a manual smoke check. No private configuration, live source session or hosted deployment was changed.

## Saved searches inside discovery filters — 13 September 2026

Moved Saved searches into the search card, after the filters and applied-filter chips. It remains a collapsed disclosure with a top divider, without its own card border or padding. All tenders / Saved stays above the combined search card. Existing responsive field/button and saved-search row spacing is preserved.

Verification: typecheck, lint and production build pass. A temporary isolated production browser check confirmed placement inside the card, collapsed initial state, saving/restoring a keyword search, and no horizontal page overflow at 1440px and 390px. Both rendered layouts were visually inspected; temporary inspection code was removed. Private configuration was preserved.

## Application spacing review — 13 September 2026

Fixed Monitoring & reminders and audited desktop/mobile spacing across discovery, matching, company/project/evidence forms, tender overview/requirements/documents, page coverage/OCR, citations, human judgments, bid tasks/readiness/decision records, calendar, comparison and account screens. Monitoring now groups its checkboxes, limits the reminder-day field width, separates calendar export with a divider and leaves space before the calendar. Evidence entry no longer nests extra panel padding. Mobile form headings and actions stack without crowding. Mobile authentication uses a content-sized brand row rather than stretching empty header space.

New form content uses the shared `.form-flow` layout (16px between content blocks, 12px for compact groups). Place it **inside** native `details` with `.disclosure-body`; do not turn `details` itself into a flex/grid container. Use `.section-spacing` for standalone panels and `.section-divider` for grouped subsections. These containers reset inherited child margins, including the older checkbox-label rule, so gaps do not accumulate. Grid fields have no added label top margin. Preserve dialog auto margins. Reuse this layout for future forms instead of mixing per-label margins with unspaced buttons and paragraphs. Saved searches retains its existing scoped responsive layout.

Verification: typecheck, lint and production build pass. All 12 existing production browser journeys passed during the review; the seven affected AI/UI/workflow journeys passed again after form/citation refinements. A temporary isolated browser audit saved reminder preferences and inspected expanded forms at 1440px and 390px, including loaded readiness/comparison, original-page viewing covered by the existing workflow journey, and sign-in/sign-up. Screenshots were visually inspected; temporary inspection code was removed after completion. The final production build and visual audit also pass after the mobile authentication correction. Tests used isolated data and source/AI fixtures. Private configuration and live-service data were preserved.

## Saved-search spacing and overview cleanup — 13 September 2026

Saved searches now uses scoped CSS with explicit disclosure/content spacing, an aligned name field and save button on desktop, stacked controls on mobile, separated saved-search rows and a 20px gap before the collection tabs. Removed the Overview “Next actions” card at the user's request. The overview only reserves its readiness sidebar when active bids exist, so an empty sidebar no longer wastes space.

Verification: typecheck, lint and production build pass. A temporary isolated production browser check saved a search, checked desktop/mobile overflow and confirmed the card is absent on the loaded `/overview` route; desktop/mobile screenshots were visually inspected. The temporary check was removed after verification. Build/server checks required execution outside the sandbox; no private configuration or live service data was changed.

## First-deployment acceptance plan — 13 September 2026

Added [PREDEPLOYMENT_CHECKLIST.md](PREDEPLOYMENT_CHECKLIST.md), covering user journeys, live integrations, account isolation, conservative readiness, hosted persistence and recovery. This is an unexecuted manual acceptance plan, not new verification. Code review confirmed that extension pairing and the Firefox extension both reject hosted destinations; monitoring requires a separate worker, private original PDFs require persistent filesystem storage, and password recovery is not configured. No configuration, application behavior, live service or deployment was changed for this documentation task.

## Integrated feature improvement — 13 September 2026

Implemented all six phases in FEATURE_IMPROVEMENT_PLAN.md as one iteration. See [FEATURE_WORKFLOWS.md](FEATURE_WORKFLOWS.md) for the delivered behavior, setup, data limits and operational boundaries.

- Shared readiness and unified requirement review now connect source-backed requirements, local checks, AI explanations, independent human judgments, optional/mandatory applicability, evidence gaps, task creation and source/document staleness. Bid cards, comparison and active-bid overview use the same calculation. Empty coverage never implies readiness; completing a task does not resolve an evidence gap.
- PDFs are retained privately with authenticated access and citation page viewing. A durable page ledger separates readable text, completed analysis and human review. Remaining-page analysis respects existing request limits and resumes completed work. Draft document hashes prevent applying results after OCR/document changes. Old drafts without hashes need fresh analysis; there is no compatibility migration.
- Local English OCR uses a bounded subprocess and bundled language data. The private evidence library supports attachments, dates, multiple financial periods and stable requirement links. Missing/expired/replaced evidence invalidates dependent conclusions. Financial attachment contents are not sent to AI.
- Matching adds explicit preferences, conservative unknown metadata handling, weighted terms/synonyms and relevant/not-relevant feedback while keeping ten-card progressive results. Saved searches restore named discovery filters. Closed candidates are excluded; synthetic matching fixtures use future dates so the tests do not expire.
- Calendar exports retain date precision and stable event IDs. An optional worker shares hourly TenderHut checks across watchers, backs off on failure, persists reminders/outbox status, cancels obsolete queued reminders and deduplicates deliveries. The local mail sink is default; real SMTP needs explicit configuration. An uncertain SMTP handoff is not retried automatically.
- Structured decisions retain reasons, gaps, effort estimates, snapshots and history. Submission acknowledgments and manual outcome records remain private and update personal pipeline stages. Checklist and decision edits are kept separately so saving one does not discard the other.

The old AI-dependent human-judgment UI/API/store flow was removed in favor of independent workflow judgments; no data migration or workspace data deletion was performed. Private configuration was preserved. New dependencies are local OCR/rendering/language data and SMTP composition support. No worker was started against the configured workspace database, and no live source/AI call, real email, commit, push or deployment was performed.

Verification: TypeScript, ESLint, 66 unit tests, production build and all 12 production browser journeys pass. New journeys cover private PDF isolation/viewing/deletion, local OCR (including a raster-only table/number fixture), evidence replacement and stale decisions, numeric-failure protection, idempotent task creation/reopening, saved searches, checklist/decision edit preservation, 35-page interrupted analysis and resume, calendar export, and repeated worker runs with a local mail sink. Tests use a fresh isolated database, source/model fixtures, and database-scoped file cleanup. Three labeled synthetic ranking cases compare the weighted implementation with the prior keyword baseline; this does not establish live ranking precision. No live SMTP, provider, AI or authenticated Firefox source-download verification was performed.

## UI/UX revision — 12 September 2026

Implemented the approved audit plan, including the typography feedback. The workspace now uses 16px body/input text, 14px labels/metadata/actions, 18–20px opportunity titles, and 12px only for minor shell captions. Shared typography tokens, larger controls, stronger muted-text contrast, focus styles and reduced-motion support replace the previous microtype.

- Discovery has explicit All tenders / Saved modes, grouped filters, applied-filter chips, an Apply filters action for advanced inputs, a compact freshness timestamp and a results-level export action. Removed the retained-catalogue UI/API branch, duplicate Discover shortcut, repeated source reminders and promotional workspace copy. Query-keyed responses prevent old results/counts/exports/pagination from appearing current during loading or after errors. Failed searches and comparison loads have retries.
- Tender results become readable cards on mobile with deadline, value, location and save visible without horizontal scrolling. Comparison remains a horizontally scrollable comparison table by design.
- Tender tabs are Overview, Documents & review, Eligibility and Changes. PDF upload, extension transfer, analysis and private findings share the Documents & review workflow, with a continuation to eligibility. Removed the duplicate Analyze documents action and zero-change badge. Source links retain their explicit external-link icon.
- Shared loading, spinner, asynchronous-button, error/retry and save-bar components provide operation feedback. Bookmarks, sign-out, notifications, transfer/pair/copy/read actions, bid creation and AI actions expose pending states. Document/eligibility/attachment load failures no longer look like empty data; pairing codes remain until listing succeeds. PDF extraction reports page progress, and failed analysis shows a paused state while retaining completed work.
- Bid tasks use compact summaries and expandable editors. New tasks stay expanded while their title changes. Bid/company forms use reachable save bars, unsaved indicators, link-navigation and reload/close protection. Company capabilities/projects are grouped before private business and financial facts; existing data and AI sharing boundaries are preserved.
- Overview emphasizes actionable tasks and saved deadlines; empty bid history and repeated source cards are removed. Calendar uses India date keys for timestamp deadlines and mobile event counts with readable agenda details. Date-only values retain their original date.
- Tender tabs support arrow/Home/End keyboard navigation. Mobile navigation supports Escape, focus containment/restoration and inert background/offscreen navigation. Dialogs have accessible titles; error toasts use error icons.

Verification: TypeScript, ESLint, 51 unit tests, production build and all eight production browser journeys pass. After the final filter-loading and attachment-error adjustments, the production build and both affected browser journeys pass again. The added UI journey checks pending search/export consistency, failed-search retry, readable text and on-screen result essentials at 1440/1024/390px, a 720px zoom-equivalent viewport, document and attachment load recovery, mobile navigation focus/Escape, unsaved-link protection, company saving and new-task editing/persistence. Six sample workspace views were also rendered at desktop/tablet/mobile sizes with no page overflow. Tests use a fresh isolated database and source/AI fixtures. No live source/AI calls, workspace data changes, commits or deployment were performed; private configuration was preserved.

## Matching loading-state spacing

Added a 24px gap below the matching toolbar so the initial retrieval status, previous-match loading status and errors do not touch the action button. Verified the rendered initial-search state with held mock requests at 1440px and 390px: 24px separation and no page overflow.

## Matching results header cleanup

Removed the repeated matching heading, process paragraph, retrieval/shortlist counts, timestamp and generated search terms from the results panel. A compact toolbar shows the loaded tender count and a secondary “Search again” action. The initial start action remains available on direct visits without saved results. Card loading, explanations and scrolling are unchanged.

Verification for header cleanup: TypeScript, lint and the existing entry-link/repeat-search browser journey pass.

## Progressive matching

Matching now renders the first ten tender cards immediately after retrieval, before AI explanations are generated. Each explanation section shows a spinner until its batch completes. Scrolling down past the loaded cards requests the next ten and starts explanations for only that new batch. Loading and explanation requests are independent, so users can fetch the next cards while earlier explanations are pending. Explanation failures leave the cards visible with an explicit retry. Reload resumes missing explanations for loaded cards only.

Removed the all-shortlist embedding preparation and semantic-ranking passes. At most three source searches still collect up to 150 metadata candidates and select a stable shortlist of up to 30 by local profile-keyword relevance. Only the requested ten are materialized and returned to the browser; future candidates receive no AI processing. This is keyword ordering with AI explanations, not semantic ranking across all candidates.

API actions are now `start` (returns first cards), `page` (returns another ten cards), and `explain` (fills explanations for an already-loaded page). Runs use `format: progressive-pages`; no compatibility or migration layer was added. Explanation requests for unloaded pages are rejected. Each ten-item page uses two bounded groups of five, validates exact candidate coverage and source quotes, and reuses successful model work after a failure. Independent field updates and client merging preserve cards/explanations when responses arrive out of order. Source/profile changes block continuation.

Overview/discovery matching links still start with one click. Their URL intent is consumed once. Refresh/back restore saved cards; incomplete profiles prompt for capabilities. A visible bottom marker alone does not auto-load more pages: downward scrolling or the load button is required.

Verification: TypeScript, ESLint, 50 unit tests, production build and all seven browser journeys pass. Browser tests hold explanation requests open to verify ten visible cards/spinners before any AI call, reject explanation requests for unloaded pages, check no initial embedding calls, exercise 10 → 20 → 25 cards with quota-failure/retry, and complete later-page explanations before earlier ones to verify concurrent scrolling and persistence. Source/model fixtures and a fresh isolated test database were used; no live AI calls.

## Source-only cleanup

Removed standalone manual/CSV/PDF tender creation, private amendment import, results/manual awards, arbitrary import/export API branches, old catalogue AI matching/profile publishing, direct ISRO PDF downloading, source-specific reference aliases, ISRO parser/collection scripts and committed snapshot artifacts. Removed obsolete planning documents and replaced setup/demo instructions. Browser tests now start with an empty isolated database and exercise provider records.

Public tenders use only `th-<provider ID>` identity. There is no owner/source/reference compatibility index, legacy identity migration or private tender identity. Notes, requirements, AI documents/findings/judgments, favorites and bids remain account-owned. Document uploads require an existing tender and current version. Source observation versions continue to drive private review staleness and task/notification updates.

Keep the existing provider JSON/HTML adapter, source-portal filters, on-demand retrieval and bounded cache fallback. Keep optional browser attachment transfer and PDF analysis. Product branding remains neutral; internal endpoints and engineering docs can name the provider. AI runs directly on explicit clicks without added sharing-consent checkboxes.

## Resume

1. Check Git status and preserve ongoing work and `.env.local`; never print credentials.
2. Read current notes rather than older designs in Git history.
3. Use `npm run check:config`, `npm run db:indexes`, then `npm run dev` on localhost. No seed/import is required.
4. Tests use a fresh random database; never point fixture flags at the configured workspace database.
5. Read installed Next.js docs before framework changes, as AGENTS.md requires.
6. Update these notes after meaningful implementation work. Do not commit, push or deploy unless requested for the current work.

Development-database cleanup removed all 77 non-provider tenders and their dependent legacy data; all 32 provider tenders remain. No compatibility migration was added. Opening a tender now refreshes workspace state after source retrieval so newly generated notifications appear immediately.

Source-only cleanup verification (previous increment): 47 unit tests, TypeScript, ESLint and production build pass. The full production browser suite passed 4/4; a final desktop/mobile journey also passed after the sidebar styling correction. Details and development-database cleanup results are recorded in [VERIFICATION.md](VERIFICATION.md).
