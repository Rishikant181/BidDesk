# UI functionality audit — 12 September 2026

**Historical audit, followed by implementation:** the user subsequently requested complete removal of alternate-source paths, with fresh iterations and no backward compatibility. The source-only cleanup removes findings 1 and 2 outright and excludes legacy tenders consistently (finding 10). Removed import/results screens described below no longer exist. Discovery mode/category/sort inconsistencies in findings 4–5 were corrected during cleanup. The later ten-result matching iteration also fixes findings 6–7 (region staleness and failed-run recovery) and matching-load error display in finding 8. Other audit findings remain separate follow-up work. See IMPLEMENTATION_NOTES.md for current behavior.

Scope: all routed workspace views, authentication/setup, visible component actions, their API handlers and relevant persistence/services. This is a code-path audit with targeted local probes, not a fresh authenticated browser or live-provider acceptance test. No production data or application behavior was changed. Existing unit suite: **62/62 pass**. Prior browser verification was read as historical evidence only.

No wholly placeholder page or obvious button without a handler was found. There is one confirmed disconnected product action, several conditional failures, and several intentionally limited workflows.

## Follow-up decision: TenderHut is the only source going forward

The user clarified this after the initial audit. Public discovery and current profile matching already retrieve only from TenderHut. Legacy paths still exist:

- Retained/saved discovery, direct tender detail and comparison can read shared legacy records; the local API does not restrict these to provider identity. Old ISRO records therefore remain reachable even though they are not the current public feed.
- The Import a tender navigation and manual/CSV/PDF notice creation, source-name input, private amendment imports and `action: "import"` permit independent non-provider tender records. These are separate from uploading supporting documents onto an existing provider tender.
- Manual award imports support arbitrary source URLs. The results page is not a provider-backed awards feed.
- Direct linked-PDF retrieval remains ISRO-specific, and the old `aiProfiles`/`aiMatches` catalogue matching service remains callable alongside the current provider matching API.
- ISRO collection/refresh/import utilities, snapshot artifacts, preparation scripts, tests and setup/README instructions remain. These are not running automatically, but some commands can still write legacy records.

For the clarified scope, retire legacy records from active product queries and remove independent source-ingestion UI/API/maintenance paths. Preserve reusable document extraction, review, bid preparation and provider observation history. Rework Results only if supported by provider data; otherwise remove it from active navigation. The discovery “Source portal” filter describes originating portals within TenderHut's feed and is not a separate ingestion integration.

This supersedes finding 10's original suggestion to add legacy records back into workspace payloads: consistency should now come from excluding them from active product flows. Archived records/history need not be deleted to achieve this. No cleanup or database deletion has been performed; this follow-up records scope and audit findings only.

## UI revision follow-up — 12 September 2026

The subsequent UI/UX revision addresses discovery pending/error state (finding 3), document/eligibility/attachment load recovery and pairing/clipboard feedback (finding 8), and India calendar grouping (finding 9). It also reorganizes document review, removes redundant controls and source reminders, establishes readable typography, and adds mobile result cards and consistent action/save patterns. See IMPLEMENTATION_NOTES.md for the implemented screen structure and final verification.

## Findings

### 1. “Use reviewed scope for matching” does not affect current matching — high

Where: Tender → Analysis → saved private findings.

The button posts `action: "profile"` and reports “Reviewed scope is ready for opportunity matching.” `publishPrivateProfile` writes `aiProfiles`. The current matching UI exclusively uses `/api/matching`, whose `startMatches` builds candidate text from upstream listing metadata; it never reads `aiProfiles`. Those profiles are consumed by the old `/api/ai` matching service, which has no current matching UI caller. This also means reviewing a privately imported tender's scope does not make that tender a candidate in the visible matching flow.

Evidence: `src/components/ai-documents.tsx:22`, `src/lib/ai/service.ts:30`, `src/lib/ai/service.ts:31`, `src/components/ai-matching.tsx:9`, `src/lib/tenderhut/matching.ts:15`.

Recommendation: connect reviewed scope to current candidate preparation, or remove this action until there is a visible consumer.

### 2. “Read document” / “Check source again” are offered for unsupported PDF hosts — medium

Where: Tender → Analysis, when a linked document has no retained text.

Both buttons are rendered for every document link. The downloader accepts only HTTPS PDFs under `www.isro.gov.in/media_isro/pdf/Tenders/`, without query strings/fragments. A link to any other host is guaranteed to fail the guard. Retained imported text bypasses downloading; local upload and transferred PDF extraction are separate working paths. This is conditional, not a claim that every visible tender has a failing document link.

Evidence: `src/components/ai-documents.tsx:18`, `src/components/ai-documents.tsx:22`, `src/lib/ai/documents.ts:8`, `src/lib/ai/service.ts:18`. Local guard probe confirmed rejection without making a network request.

Recommendation: offer direct reading only when supported; otherwise show the upload/transfer action with an explanation before clicking.

### 3. Discovery can show/export old results under new filters — medium

Changing the query launches a request but does not clear the prior `result` or set a pending flag. Until completion, the new controls describe the previous rows, count, freshness message and export contents. On failure the table shows an error, but the old count, freshness, export and pagination state remain available.

Evidence: `src/components/discovery.tsx:21` and the `result`-based export/toolbar in the same component.

Recommendation: track the query associated with results and disable exports/pagination while another query is pending or has failed.

### 4. “Browse all tenders” can leave the user in Saved mode — medium

Reproduction from code: enable Saved, enable My retained catalogue, then click Browse all tenders. This only removes `local=true`; `favorites=true` remains. The API still takes the saved/local branch. The button therefore does not do what its label promises in this reachable combination.

Evidence: `src/components/discovery.tsx:22` and its catalogue-toggle handler; `src/app/api/data/route.ts:37`.

Recommendation: make public, retained and saved modes mutually exclusive or clear both flags when choosing all tenders.

### 5. Retained discovery has mismatched filter/sort behavior — medium

- Category choices always come from upstream metadata. Categories present only in private/legacy imports cannot be selected from this dropdown, even though the local API supports filtering them.
- The sort control defaults to “Closing date”, but the local API defaults to `newest` when no sort parameter is supplied. Fresh `/discover?local=true` and `/discover?favorites=true` URLs can therefore display a different order than the selected control indicates.

Evidence: `src/components/discovery.tsx:27` and category/sort rendering; `src/app/api/data/route.ts:55`, `src/app/api/data/route.ts:64`.

Recommendation: use local category options for local mode and align default sort values.

### 6. Changing operating regions does not mark matching results stale — medium

Regions influence upstream retrieval in `planSearches`, but `profileText` excludes them. Both stale-result detection and resume validation hash only `profileText`. Changing Gujarat to Karnataka leaves the previous results looking current and permits resuming the old geographic search.

Evidence: `src/lib/tenderhut/matching.ts:11`, `src/lib/tenderhut/matching.ts:12`, `src/lib/tenderhut/matching.ts:19`, `src/app/api/matching/route.ts:10`. Local probe confirmed different retrieval locations with identical staleness hashes.

Recommendation: hash all retrieval/ranking inputs, including regions, separately from the text embedded by the model.

### 7. A matching preparation error can remove “Resume analysis” and discard candidates — medium

If a `prepare` request fails, the client breaks out of its loop but still calls `finish`. The server marks the run finished even on AI fallback. If at least one item was prepared and the ranking loop succeeds, it truncates the candidate array to those prepared items. The UI then hides Resume analysis and says matching completed. A transient failure partway through a run can therefore leave fewer candidates and require a new search instead of resuming.

Evidence: `src/components/ai-matching.tsx:10`, `src/lib/tenderhut/matching.ts:21`.

Recommendation: preserve all retrieved items and distinguish a completed run from a partially prepared, resumable run.

### 8. AI/attachment sections silently hide load failures — medium

Initial AI document, eligibility and matching loads swallow errors. Attachment listing ignores non-array error responses and has no rejection handler. Failed authentication/network/database requests can look like no documents, no previous analysis, no previous matching run or no transferred files. “Review transferred files” also clears the pairing code before its list request succeeds.

Evidence: `src/components/ai-documents.tsx:17`, `src/components/ai-documents.tsx:25`, `src/components/ai-matching.tsx:8`, `src/components/attachments.tsx:4`.

Recommendation: show loading/error/retry states and clear the transfer code only after successful file-list retrieval. Clipboard copying also lacks failure feedback.

### 9. Calendar can put a deadline on the wrong day despite its IST label — medium

Calendar groups deadlines using `closesAt.slice(0,10)`, instead of converting timestamp values to IST. The current month/today calculation also uses the browser timezone. Local probe: `2026-09-12T20:00:00Z` is displayed elsewhere as **13 September, 01:30 IST**, but the calendar places it on **12 September**. Date-only records are unaffected by the timestamp-conversion issue.

Evidence: `src/components/workspace-views.tsx:17`, `src/lib/domain.ts:12`.

Recommendation: derive calendar day/month/today keys consistently in IST, while retaining date-only precision.

### 10. Saved legacy tenders can disappear from calendar/overview data — medium

The workspace tender query only includes provider-identity tenders and the current user's private imports. Shared legacy snapshot tenders are excluded even if favorited or linked to a bid. Saved discovery still queries all visible tenders, so the same saved legacy tender can be accessible there but absent from calendar deadlines. Its bid can also show “Not published” for the deadline because the bid editor resolves it from the workspace tender list.

Evidence: `src/app/api/data/route.ts:61`, `src/app/api/data/route.ts:75`, `src/components/workspace-views.tsx:17`, `src/components/bids.tsx:11`.

Recommendation: include tenders referenced by the user's favorites/bids in the workspace payload, regardless of identity kind. This affects retained legacy records, not every new provider tender.

## Visible features that are limited, but not dead

| UI area | Actual functionality / boundary |
| --- | --- |
| Tender results | Real manual award import, search and coverage counts. No current upstream award feed or preloaded award dataset was established by this audit. |
| Submitted / won / lost | Persisted personal bid statuses. They do not submit a bid or fetch an official award. The UI explains this. |
| Responsible person | Saved free-text name/role; no account assignment, invitations or delivery to that person. |
| Notifications / Changes | Real persisted version-change events and mark-read. Updates are discovered on relevant retrieval/import operations; no continuous monitoring or email/push reminders. Version history is observation history, not exhaustive official corrigenda. |
| Firefox attachments | Pairing, transfer, download and PDF extraction are implemented. The user's real authenticated Firefox download is explicitly unverified in the implementation handoff; do not classify it as proven working or dead. |
| PDF analysis | Real text extraction and AI endpoints; no OCR/Word analysis. Unknown source fields and unreviewed eligibility are data/review gaps, not dummy widgets. |
| Comparison | Fetches selected tender details and performs real local requirement assessments. Missing requirements cannot produce a complete qualification comparison. |
| Human evidence judgments | Stored separately from local/AI outcomes, as explicitly described; recording one does not change the automatic assessment badge. |
| Exports | Discovery exports the displayed page, checklist exports current task values. No promise of an entire upstream catalogue export. |

## Coverage and verification limits

Inspected: Overview, Discover (public/saved/retained/profile), Comparison, Tender detail's five tabs, bids/list/editor, Calendar, Results/import, Company/AI evidence, manual/CSV/PDF imports and amendments, notifications, authentication, setup and extension wiring. Followed visible mutation actions into data/AI/matching/attachment handlers and services.

Verification this audit: 62 unit tests passed; executable local probes confirmed the region-hash omission, IST calendar mismatch and unsupported-PDF guard. Other findings are source-confirmed paths with their trigger conditions stated. No new browser session, Atlas mutation, source scrape, Gemini call or real extension download was performed. Existing tests passing does not establish that the findings above are covered.

Suggested order: fix the disconnected matching action first, then matching input/recovery behavior and misleading discovery state, followed by filter consistency, document availability/error states and calendar/workspace coverage.
