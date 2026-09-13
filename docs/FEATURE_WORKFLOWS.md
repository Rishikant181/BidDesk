# Review, evidence and preparation workflows

Implemented for the local prototype, September 2026. TenderHut remains the sole tender source. All uploaded documents, evidence, judgments, decisions and submissions are account-owned.

## Bid readiness and decisions

Tender Overview, bid detail, bid cards, comparison and active bids on the overview use one server-side readiness calculation. It distinguishes incomplete review, unresolved blockers, and readiness for final review. Task completion is separate. Empty requirements or unknown document coverage cannot produce a ready state. Optional confirmed requirement gaps are warnings; unknown importance still needs review.

In Eligibility, use Review requirements to set importance/applicability and link company evidence. Each requirement shows its local check, AI evidence (when requested), human judgment, source references, evidence gaps and task action together. Human review works without AI. Supporting judgments cannot override a failed local numeric check. Source/document/evidence changes invalidate dependent review conclusions. A repeated Create preparation task action reuses the requirement's task.

Private reviewed deadline findings can inform readiness when the published deadline is absent; they do not overwrite the public tender. Conflicting published/document facts remain unresolved.

Bid records capture the bid/no-bid choice, reasons, known gaps, estimated hours, reviewer, time and an input snapshot. The UI saves the decision and submission fields together. Checklist edits must be saved before recording a decision; saving the checklist retains unsaved record edits. Submission date/reference, acknowledgment PDF and user-recorded outcomes are private. Recording a submission or won/lost outcome updates the personal pipeline, never the published source status. Outcome counts summarize only recorded outcomes.

## Documents and evidence

Uploaded and selected transferred PDFs are retained under `.local/documents/<database hash>/` with private permissions, randomized IDs and authenticated reads. Override the root with `BIDDESK_FILE_ROOT` for a persistent local disk. This adapter requires persistent shared storage if the app and worker run on different machines; no hosted storage has been provisioned.

Limits remain 20 MB/PDF, 250 pages, 25,000 characters/page, 700,000 characters/document and 20 attached documents per tender version. Transferred archives still expire after 24 hours; a PDF selected for review has its own retained copy. PDFs uploaded as reusable evidence or acknowledgments are private files and are not automatically sent to AI.

The page grid distinguishes unreadable/scanned pages, completed analysis and human review. A durable ledger is keyed by owner, document, document content hash, page and analysis configuration. “Analyze remaining pages” processes readable uncompleted pages in batches within 30 pages/120,000 characters, retaining successful work on failure. Stop takes effect after the current section. Drafts keep their exact completed-page coverage; completed analysis never implies human review. Use Previous analyses to review each batch's findings; the current history response is bounded to the latest 100 drafts.

Citation links open the actual PDF page with the quoted text. Text-only records can still display retained text; the original PDF must be reattached for image viewing. Page-image rendering is bounded to 12 million pixels. Deletion removes the tender document and its original binary and leaves missing-evidence gaps in dependent reviews. An evidence record that references that file will need a replacement.

OCR is explicit and local. The bundled Tesseract English data processes selected pages in a bounded subprocess, with one job per account, a 60-second job limit and at most ten pages/request. The UI submits selected pages one at a time, so successful pages survive a later failure. PDF images are rendered locally; documents are not uploaded to an OCR service. OCR confidence and source-image review warnings remain visible. OCR changes invalidate old analysis drafts, page coverage and judgments. Other languages and accuracy on arbitrary handwriting/complex tender tables are not established.

The private evidence library supports certificates, financial records for multiple periods, projects and other PDFs. Requirements link stable evidence IDs. Financial checks use a linked matching period; certificate checks require the exact declared certification name and validity through the tender deadline. Replacing/removing evidence makes dependent judgments and decisions stale. The library shows tenders using each record. Financial amounts and attachments stay out of AI prompts; existing explicit company capability/project sharing remains unchanged.

## Discovery

Named saved searches restore discovery filters independently of saved tenders. Matching preferences include regions, optional strict geography/value filters, excluded work phrases and minimum preparation days. Values use INR. Unknown metadata remains identifiable. Closed/cancelled/awarded candidates and explicit negative feedback are excluded; positive feedback and preferred regions/value adjust ordering.

Matching remains bounded to three source searches, 150 metadata candidates and a shortlist of 30. It still displays ten cards before explaining them and processes explanations only for loaded cards. Ranking weights title/category/scope terms and a small explicit synonym dictionary. It is heuristic relevance, not semantic qualification. Three labeled deterministic ranking cases compare with the prior keyword baseline; these are not a measured claim of improved precision on live tenders.

## Monitoring and calendar

Enable Monitoring & reminders in Calendar. Choose saved tenders, active bids/internal tasks, reminder lead days and optional email. Download calendar emits stable event IDs, date-only all-day deadlines and explicit timestamp deadlines. It is a snapshot, not a live calendar subscription.

Run `npm run monitor` for one pass or `npm run monitor -- --watch` for a continuing worker. The worker wakes every minute, refreshes at most 20 due source records per pass, and schedules successful source checks an hour apart. Failure backoff reaches six hours. It shares public refreshes across watchers, uses a database lease, preserves last-success source freshness and persists an outbox. Current prototype bounds are 100 watched accounts, 200 active bids/saved tenders per account and 50 deliveries per pass. Use one logical worker against the same database/storage as the app.

No worker is started by `next dev`. The Calendar settings show its last run and delivery statuses. App-only reminders work without email configuration. `BIDDESK_MAIL_MODE=sink` is the default; email-designated reminders are written as private JSON files under `.local/mail/<database hash>/`. This verifies composition and deduplication without sending email.

For actual email, configure `BIDDESK_MAIL_MODE=smtp`, host, port, sender and optional SMTP credentials. SMTP requires TLS. Delivery uses stable message IDs. An interrupted/failed SMTP handoff may have an uncertain outcome, so it is marked for manual inspection instead of automatically sending a duplicate. This is not a claim of exactly-once email delivery. Queued reminders are cancelled when watches are disabled, tasks finish or deadlines change. Events already delivered remain as history.

## Verification and remaining operations

Use the normal typecheck, lint, unit, production-build and browser commands in README. Browser tests create and remove a random isolated database, use source/model fixtures, and run notification delivery into the local sink. Test document and sink directories are scoped by database hash.

No deployment, live SMTP delivery, paid service provisioning or live source/AI call is implied by fixture verification. The authenticated Firefox upstream download still needs its separate manual smoke check. Keep private configuration intact. Before hosted deployment, choose persistent storage and a worker host, validate live provider access cadence and test the intended SMTP service separately.
