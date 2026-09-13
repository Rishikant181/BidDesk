# First-deployment acceptance checklist

Prepared 13 September 2026 from the implemented application. This is a test plan, not a record of passing manual tests. The latest recorded automated verification is 66 unit tests, 12 production browser journeys, typecheck, lint and build. Those journeys use source/model fixtures and a local email sink; live integrations and a hosted runtime still need verification.

Use a private staging installation with the intended hosting configuration and a separate database/storage location. Record each result as PASS, FAIL or NOT TESTED, with the build identifier, browser, date and evidence. Use dummy business documents and an inbox you control.

## Resolve before full-feature deployment

- Firefox attachment transfer currently rejects non-localhost destinations in both the pairing API and extension. Hosted support needs implementation and testing; otherwise remove/disable that hosted action and verify manual download/upload as the supported path.
- Original PDFs are private filesystem files, separate from MongoDB. Confirm persistent storage for `BIDDESK_FILE_ROOT` (or the default `.local/documents`), private permissions, and access from every app instance that serves files. Do not assume a database backup includes PDFs.
- Monitoring needs a separate worker (`npm run monitor -- --watch` or scheduled single runs). Starting the web app does not start it. Configure worker supervision, the same intended database, and real SMTP if email is enabled; the default mail sink does not send messages.
- The runtime must support the Node application, PDF/OCR subprocesses, native rendering dependencies and their resource needs. Test the actual packaged deployment. The current start command binds to `127.0.0.1`; confirm the hosting proxy/container can reach it or adjust the binding for that environment.
- Sign-up/sign-in exist; a forgotten-password recovery flow is not currently configured. Resolve account recovery before inviting users who need self-service recovery.

## Prepare a test kit

- Two accounts in separate browser profiles, plus a signed-out browser.
- Several real TenderHut opportunities: active, closed, unknown value/deadline, and different regions/categories. Compare displayed facts with their source pages.
- A readable PDF, a document longer than 30 pages, a mixed text/scan PDF, and representative English scanned tables. Write down the correct page numbers, dates and amounts before analysis.
- Dummy valid and expired certificates, financial records for different periods, an insufficient financial amount, project evidence and a dummy submission acknowledgment.

## 1. Account access and privacy

- [ ] Sign up, sign out, sign in, try an incorrect password, refresh, and open a tender/bid deep link directly. Valid access works; invalid access produces a usable error.
- [ ] On the final staging HTTPS domain, verify login persists across navigation and refresh, and sign-out removes access to private data.
- [ ] As account A, create evidence, upload PDFs, save tenders and create a bid. Account B must not see A's private records. Try A's private PDF URL as B and signed out: access must be denied. Shared public tender facts may be identical.
- [ ] Let a session expire or remove its session in staging, then attempt a save/upload. The UI must explain the failure without claiming success.

## 2. Discover, save and compare

- [ ] Search by keyword and combine available filters, sorting and pagination. Clear filters and switch All/Saved. Displayed results, counts and applied filters must agree.
- [ ] Save/unsave a tender and reload. Create, restore, rename and delete a named saved search; restored filters must reproduce the intended search.
- [ ] Export results and inspect the downloaded file, including commas/newlines in titles. Export covers the displayed page and must not silently export an older search during loading.
- [ ] Compare up to four tenders, remove a selection, and open each detail/source link. Values, deadlines and readiness must refer to the correct tender.
- [ ] Test a source failure and retry in staging. Failure must not appear as a successful empty result or overwrite current results with an older request.

## 3. Company profile and matching

- [ ] Save capabilities, projects, preferences and financial/certificate facts; reload and check persistence. Navigate away with unsaved edits and verify the warning.
- [ ] Try matching with an incomplete profile, then with a useful profile. Cards should appear before explanations; load subsequent pages when enough candidates exist.
- [ ] Refresh/back-navigation should retain the current run. Explicit Search again should start a new run.
- [ ] Exercise region/value preferences, exclusions, preparation days and relevant/not-relevant feedback. Known excluded/closed candidates must be excluded; unknown metadata must remain explicit.
- [ ] Change matching inputs and verify the old run cannot continue as if current. Review a sample of live suggestions yourself: explanations must quote the tender and avoid inventing eligibility. Good relevance is a manual judgment, not proven by synthetic ranking tests.

## 4. Documents, AI, OCR and citations

- [ ] Upload the readable PDF to a source-backed tender. Verify page count/text and open citations against the original PDF at the correct page. Reload and open it again.
- [ ] Run analysis with the real configured AI service using dummy documents. Review and apply findings; unsupported claims or wrong citations are failures requiring correction.
- [ ] Analyze the long PDF, stop after a section, resume, and retry a controlled later-section failure. Successful work must remain saved without duplicated findings.
- [ ] Verify analyzed pages and human-reviewed pages are separate. Review selected page ranges; unreadable/unreviewed gaps must remain visible.
- [ ] OCR selected scanned pages. Compare amounts, dates, negations and table associations with the original. Low-confidence or inaccurate text needs human correction/review. English OCR is not proof of support for handwriting or other languages.
- [ ] Change OCR text/document inputs and verify old drafts/coverage cannot silently count as current. Delete a linked document: its private download must stop working and dependent evidence/readiness must show the gap.
- [ ] Try invalid/non-PDF input, an over-20 MB PDF, and an over-250-page PDF. Expect a clear rejection with no phantom successful document. Verify recovery with a valid upload afterward.

## 5. Evidence and readiness — release-critical

- [ ] Add valid, expired and missing evidence; link reusable evidence to requirements on multiple tenders. Verify period, expiry and amount checks use the intended records.
- [ ] Exercise mandatory, optional, unknown and not-applicable requirements. Missing required evidence or incomplete review must prevent a ready state; optional gaps should be treated appropriately.
- [ ] Record human judgments without running AI. A favorable explanation/judgment must not hide a known numeric failure or unresolved document coverage.
- [ ] Create a preparation task from a gap twice: it should reuse the task. Completing it must not itself satisfy the evidence requirement. If the gap returns, the existing task should reopen appropriately.
- [ ] Replace/delete shared evidence and change relevant company facts. Dependent judgments and decisions must become stale. Overview, bid detail and comparison must agree on readiness.
- [ ] Test a closed deadline and a missing source deadline. A private deadline must remain private and must not rewrite the source fact. “Ready for final review” still requires your final submission review.

## 6. Bid preparation, decisions and outcomes

- [ ] Create a bid, edit/save tasks and deadlines, complete/reopen tasks and reload. Verify stages and overview counts follow the saved data.
- [ ] Keep an unsaved decision draft while saving a checklist change. The draft must survive. Attempt to save records with a dirty checklist and resolve the prompt.
- [ ] Edit the same bid in two tabs. A stale save must not silently overwrite newer work.
- [ ] Record bid/no-bid reasons, effort and gaps; inspect reviewer/time/history. Change evidence or requirements afterward and confirm decision staleness.
- [ ] Record submission date/reference, acknowledgment and private notes, then won/lost/no-bid outcomes. Verify persistence, private access and pipeline/history summaries. This records a submission; it does not submit to the official portal or verify an award.

## 7. Changes, calendar and reminders

- [ ] Observe a real source update, or use a controlled source response in isolated staging. Check the Changes view, dependent stale reviews/tasks and notifications. A failed refresh must not invent a change.
- [ ] Check source deadlines and internal tasks in the calendar, especially a timestamp near midnight in India and a date-only deadline. Export ICS and import into your calendar: date/time precision and event identity should be correct.
- [ ] Enable monitoring for saved tenders and active bids. Close the browser and run the worker when a check/reminder is due. Confirm source checks, in-app notices and delivery status persist.
- [ ] Run/restart the worker repeatedly. The same reminder must not be duplicated. Complete/change a task, change a deadline or disable monitoring; obsolete queued reminders must be cancelled.
- [ ] Configure SMTP in staging and send a due reminder to your own account email. Check actual inbox/spam delivery, recipient, deadline and hosted links. SMTP handoff alone is not proof of inbox arrival. Test failure handling; “delivery uncertain” must not be reported as delivered or automatically resent.
- [ ] Treat ICS as a snapshot: later changes in BidDesk are not automatically synchronized to an already imported calendar.

## 8. Attachments, devices and failure recovery

- [ ] Verify manual TenderHut download followed by PDF upload on the hosted app.
- [ ] If hosted extension support is implemented, test a real signed-in Firefox TenderHut session, valid pairing, expired/reused codes, wrong tender and unsupported/oversized ZIPs. Local fixture transfer does not establish real session-download success.
- [ ] Complete the core journey on desktop and a real mobile browser. Check menus, forms, comparison scrolling, PDF viewing, keyboard-only navigation, dialog focus/Escape and 200% zoom.
- [ ] In staging, interrupt the network during search, save, upload and analysis; test AI quota/credential errors. Look for clear recovery, preserved completed work and no endless spinner or false success.

## 9. Hosting, persistence and recovery

- [ ] Check database connectivity/indexes, real source retrieval and real AI execution from the hosted runtime. `npm run ai:check` checks configuration only, not an AI request. Keep all test/fixture settings out of deployment configuration.
- [ ] Restart/redeploy the app after saving a bid and uploading both tender/evidence PDFs. All records and original files must still open. Repeat with the intended number of app instances.
- [ ] Run a representative large PDF extraction and scanned-page OCR on the actual host. Verify acceptable completion and readable failures under the host's memory/time limits.
- [ ] Restart the worker separately and confirm it resumes. Confirm errors are visible to the operator and private files/configuration are not publicly served or printed in logs.
- [ ] Back up and restore both MongoDB and private PDF storage into an isolated recovery environment. Open restored bids and files. Storage defaults are database-name-scoped: a renamed restore database needs an explicitly verified file-location mapping.
- [ ] Exercise the documented process for restoring the previous application release and matching data/files before depending on it for recovery.

## Automated check and release record

On the release candidate, run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` using the documented isolated test setup in [VERIFICATION.md](VERIFICATION.md). Do not enable fixtures against a real workspace. Run live source/AI checks separately with test content; live AI can incur usage charges.

Do not open access to real users with cross-account access, lost records/files, incorrect deadlines, false-ready results, broken sign-in, or an enabled integration that cannot operate on the host. Mark untested workflows explicitly and resolve failures before sign-off. Immediately after deployment, repeat sign-in, discovery, save, PDF open, bid save and a controlled reminder test on the final domain.

| Workflow | Result | Build/environment | Evidence or issue |
| --- | --- | --- | --- |
| Accounts and privacy | NOT TESTED | | |
| Discovery and comparison | NOT TESTED | | |
| Profile and matching | NOT TESTED | | |
| Documents, AI and OCR | NOT TESTED | | |
| Evidence and readiness | NOT TESTED | | |
| Bids and decisions | NOT TESTED | | |
| Changes, calendar and reminders | NOT TESTED | | |
| Attachments and devices | NOT TESTED | | |
| Hosting and recovery | NOT TESTED | | |
