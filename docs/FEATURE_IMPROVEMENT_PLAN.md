# Feature improvement plan

Planned 13 September 2026; subsequently implemented as one integrated iteration. This document preserves the delivery design; see FEATURE_WORKFLOWS.md and IMPLEMENTATION_NOTES.md for delivered behavior and verification limits. Based on the current source and IMPLEMENTATION_NOTES.md; no new browser acceptance or live-source verification was performed for planning.

## Objective and constraints

Help a user discover a suitable opportunity, review its documents, decide whether to bid, and complete preparation with clear evidence and next actions.

- TenderHut remains the only tender source. Uploaded evidence and tender attachments do not create independent tender records.
- Keep private findings separate from public source facts, and financial facts separate from AI-shareable material. New evidence uploads are private by default; do not expand AI sharing implicitly.
- Preserve the ten-card progressive matching experience and bounded source/model requests. AI analysis remains explicitly initiated.
- Treat this as a fresh prototype iteration: replace superseded structures directly without compatibility layers. Preserve private configuration and do not delete workspace data as an implicit implementation step.
- Keep unknown facts, incomplete document coverage, and stale judgments visible. Preparation readiness is not official qualification or submission.
- No deployment, outbound messages, paid service provisioning, commits, or production data changes are part of this planning task.

## Delivery order

Each increment should be usable and verified before the next. Phase 1 provides value from existing data; subsequent phases enrich the same readiness and review model.

### 1. Bid readiness and a unified requirement review

**Outcome:** Opening a bid explains what remains unresolved and where to act.

Build a shared server-side readiness calculation from effective requirements, local assessments, current human judgments, evidence gaps, source conflicts, changed tasks, and deadlines. Return reasons and linked actions rather than a percentage suggesting qualification. Keep task completion as a separate preparation measure.

Use three summary states: review incomplete, blockers outstanding, and ready for final review. An empty requirement list or unknown review coverage must never produce a ready state. Distinguish blocking issues from informational warnings; introduce explicit requirement importance/applicability with an unknown default and source-backed human confirmation. Never infer that every extracted clause is mandatory.

Present one row per requirement containing the source clause, local result, AI supporting evidence, human conclusion, freshness, and next action. Human judgments remain attributable and do not silently overwrite local failures or source conflicts. Allow a human review without first requiring an AI run; bind it to the current requirement, tender version, and evidence inputs.

Add “Create preparation task” on unresolved items, with an idempotent link to the underlying issue. Task completion does not resolve an eligibility gap by itself. Reuse existing requirement synchronization and version-change handling. Show the deadline, readiness state, and highest-priority unresolved action on bid cards and the overview.

**Primary code:** schemas/domain/store, data and AI APIs, tender detail, AI documents, bids, workspace views. Extract shared readiness logic and a reusable requirement review component.

**Acceptance:** zero reviewed requirements stays incomplete; stale supporting judgments do not count as current evidence; repeated task creation produces one task; completing a task does not erase its underlying gap; changed requirements reopen linked work; owner isolation and revision conflict handling remain intact. The full review-to-task-to-bid journey works on desktop and mobile without AI configured.

### 2. Document coverage and citation navigation

**Outcome:** Users know which supplied pages have been processed and can inspect the evidence behind a finding.

Build a persistent coverage ledger keyed by owner, document hash, source version, page, and analysis configuration. Existing drafts already record coverage, but the latest eight drafts are not a complete ledger. Track text availability, analysis completion, and human review separately. Label totals as coverage of supplied documents; do not imply that every official attachment is present.

Replace comma-separated page selection with page ranges and visible page states. Add “Analyze remaining pages” using the existing per-request limits, explicit start, progress, stop-after-current-request, and resumable failures. Commit successful batches independently and preserve citations while deduplicating repeated findings across batches.

Introduce an owner-scoped document storage interface. Use a private filesystem adapter for local development and select durable hosted storage when a deployment target exists. Retain original uploaded/transferred PDFs explicitly as workspace documents instead of depending on the 24-hour transfer cache. Define deletion, size limits, content validation, authenticated reads, and references shared by findings before adding the viewer.

Open citations at the relevant PDF page with the exact extracted quote beside it; use text highlighting where positions can be reliably mapped. On mobile, use a full-screen reader. Existing text-only records can show retained page text and request reattachment for the original PDF; no fabricated document view.

**Acceptance:** a document over 30 pages resumes after a middle-batch failure without rerunning completed batches; changed document bytes invalidate coverage; analyzed pages are not labeled human-reviewed; citation links resolve to the correct owned document/page; another account cannot fetch a binary; deleting a document leaves an explicit missing-evidence state.

### 3. Reusable evidence and scanned documents

**Outcome:** Company evidence can be maintained once and used across bids, including scanned PDFs.

Add private evidence records with type, title, attachment, financial period, issue/expiry dates, version, and existing AI-sharing boundaries. Connect certifications, projects, financial facts, requirements, and preparation tasks to stable evidence IDs. Show affected bids when evidence expires or is replaced. Support multiple financial periods without collapsing them into one turnover value; complex financial formulas remain explicitly reviewed.

Add OCR behind the document processing interface. Begin with a bounded local worker for the prototype, selected after an evaluation on representative scans. Detect sparse/mixed text page by page, let users select pages, and retain original images, OCR text, page ordinals, and extraction method. OCR uncertainty must remain visible during review. Do not start external OCR sharing automatically.

**Acceptance:** one certificate supports multiple bids; expiry is assessed against each tender deadline; evidence replacement makes dependent reviews stale; private financial attachments do not enter AI prompts; mixed scanned/text PDFs retain correct page citations; low-quality scans remain flagged for review. Benchmark extraction on representative tables, rotated scans, and languages present in sample tender documents before claiming support.

### 4. Discovery relevance and saved searches

**Outcome:** Users retrieve fewer irrelevant opportunities and repeat useful searches easily.

Add company matching preferences for geography, contract value, excluded work, and minimum preparation time. Separate strict exclusions from soft preferences; missing value or date fields must remain identifiable rather than silently treated as failures. Hash every retrieval/ranking input for stale-run detection.

Improve candidate retrieval and ordering with normalized capability terms, curated synonyms, phrase weights, and field weights. Keep source searches bounded and explanations limited to loaded cards. Store per-user relevant/not-relevant feedback with optional reasons; first use it for explicit exclusions and controlled ranking adjustments. Do not introduce an opaque learned model before sufficient evaluation data exists.

Create owner-scoped named saved searches using the existing discovery filter schema. Restore all filters, support rename/delete, and keep saved searches distinct from saved tenders. Include a compact explanation of decisive match factors without restoring the removed verbose matching header.

**Acceptance:** equivalent saved searches restore identical filter values; exclusions work predictably; unknown metadata stays visible; preference changes invalidate old runs; ten cards still render before AI explanations; failed explanations never remove cards. Compare ranking precision and useful candidate coverage against the current keyword baseline on a fixed, human-labeled fixture set before adopting new weights.

### 5. Monitoring, reminders, and calendar export

**Outcome:** Changes and upcoming deadlines can surface without manually opening every tender.

First add downloadable calendar events for saved deadlines and internal tasks. Preserve India date handling, use all-day events for date-only deadlines, stable event IDs, and no invented closing time. Explain that a downloaded file is a snapshot, not automatic calendar synchronization.

Then add explicit watch preferences for saved tenders, active bids, and optionally saved searches. Implement a bounded scheduled worker that reuses TenderHut retrieval/version logic, deduplicates shared public refreshes, and fans out private impact notifications. Include leases, retry/backoff, checkpoints, and a durable notification outbox so multiple workers cannot duplicate delivery. Failed refreshes must not advance successful freshness timestamps or imply no changes.

Expose internal deadline reminders and meaningful change impacts: what changed, which evidence/review/tasks are affected, and where to act. Add email as the first external channel behind user preferences and deduplication; keep delivery status and failures visible. Choose hosting/scheduler and email provider at this phase, verify current provider access constraints, and test delivery through a local sink before any real sending.

**Acceptance:** rerunning a job does not duplicate reminders; date changes reschedule pending reminders; cancellation closes obsolete reminders; transient source failure preserves the last successful check; worker restarts recover pending work; disabled watches stop future delivery. Automatic monitoring is only operational while the worker is running, which must be visible in setup/status.

### 6. Decision comparison and submission records

**Outcome:** Users can compare reviewed opportunities, record their decision, and retain evidence of submission and outcomes.

Enrich the existing comparison of up to four tenders with requirement coverage, unresolved blockers, evidence gaps, deadline, deposit/value, and user-estimated preparation effort. Use the same readiness calculation as bid detail; avoid a competing score. Distinguish published facts, reviewed findings, and unknown values.

Add a structured bid/no-bid decision containing reasons, known gaps, reviewer/time, and an input snapshot. Mark it for reconsideration when relevant inputs change. Preserve a free-text rationale for context.

When marking submitted, offer submission time, portal reference, acknowledgment attachment, and notes. Permit manual status tracking with missing confirmation clearly marked. Won/lost remain user-recorded outcomes with date, reason, and optional evidence; no inferred awards feed or official submission integration. Add basic outcome summaries only when enough user-recorded history exists, without implying causality.

**Acceptance:** the same tender has consistent readiness in comparison and bid detail; missing data never ranks as a failure or a pass; decision snapshots remain inspectable after source changes; submission evidence persists privately; manual outcomes do not alter public source status.

## Dependencies and implementation boundaries

- Phase 1 establishes the shared readiness/review contract. Phase 2 adds reliable coverage inputs. Phase 3 adds reusable evidence inputs. Phase 6 consumes all three.
- Phase 2 private binary storage supports the viewer, Phase 3 evidence/OCR, and Phase 6 acknowledgments.
- Phase 4 can follow Phase 1 independently of document storage. Calendar export can ship before the scheduled worker.
- Team invitations, real assignee accounts, live calendar subscriptions, Word conversion, additional tender sources, automatic submission, and an awards feed are outside this plan.
- Read the relevant installed Next.js guides before implementation. Preserve unsaved-form protection, keyboard/mobile behavior, retry states, and explicit AI actions throughout.

## Verification and release gates

For each increment, run TypeScript, lint, focused unit tests for the changed domain rules, a production build, and the affected production browser journeys. Run the complete browser suite at integrated phase boundaries. Use fresh isolated databases and deterministic source/model fixtures; never enable fixtures against the workspace database.

Prioritize tests for stale inputs, unknown information, idempotency, authorization, interruption/retry, and cross-view consistency. Include desktop/mobile review, PDF citation navigation, and document deletion behavior. Use a local notification sink and representative non-sensitive OCR samples. Live TenderHut, AI, signed-in extension, OCR, and delivery checks must be reported separately from fixture verification.

Track useful outcomes: time from opening a tender to a recorded decision, unresolved issues resolved per bid, supplied-page review coverage, top-ten matching relevance, repeated evidence entry avoided, and duplicate/missed reminder counts. Establish baselines before claiming improvement.

Update IMPLEMENTATION_NOTES.md after each completed increment with actual behavior, verification, and remaining limits. Service selection and external activation are later implementation decisions; they do not block beginning Phase 1.

## First implementation increment

Deliver Phase 1 as the first reviewable change: shared readiness logic, unified requirement rows with independent human review, idempotent task creation, and deadline/blocker visibility on bid cards. Use existing evidence references and conservative unknown coverage until later phases land. The acceptance journey is: review a requirement, identify a gap, create linked work, update evidence, and observe the readiness state change consistently across tender and bid views.
