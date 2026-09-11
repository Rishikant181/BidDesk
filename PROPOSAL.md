# BidDesk — Product proposal and implementation brief

Status: agreed POC direction; implementation has not started.
Recorded: 2026-09-11.
Repository: `~/Repositories/BidDesk`.

Implementation sequence and technical decisions: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

## Purpose

Build a polished, usable tender discovery and bid preparation proof of concept inspired by [TenderDetail](https://www.tenderdetail.com/). The UI need not copy the original. Improve usability and connect discovery to eligibility assessment and bid preparation.

The product will be presented as a demo, but must use real tender data and support real user work. It must not depend on fabricated opportunities, scripted answers disguised as AI, or nonfunctional buttons.

The core journey is:

**Find a tender → review requirements → assess eligibility → shortlist → prepare the bid → track changes and deadlines.**

## User decisions and constraints

- Prioritize a usable POC and a coherent presentation over full commercial-platform scale.
- Aim for one substantial implementation pass, followed by necessary verification and demo rehearsal. “One shot” is a delivery preference, not a reason to skip verification.
- Use real tender data instead of fictional sample records.
- Keep additional infrastructure and API costs as close to zero as possible.
- Use MongoDB Atlas Free for persistence; this supersedes earlier SQLite and browser-only storage proposals.
- Run locally initially. Deployment is explicitly out of scope for now.
- Preserve compatibility with a later Vercel deployment, including its Hobby technical constraints.
- No monetization, subscriptions, billing, payment flows, or paid service integrations.
- Existing development subscriptions, model usage charges, and human time are separate from the zero-infrastructure-cost target.
- Do not ask for another product-scope approval before carrying out already authorized work. This document records direction; the current request only authorizes saving the proposal, not deploying or creating external accounts.

## Reference-site assessment

TenderDetail's public pages expose or advertise:

- Indian/global tender discovery and location, authority, and category browsing.
- Advanced keyword search, include/exclude terms, value/date/location filters, and international classification filters.
- Tender details, documents, financial requirements, timelines, saves/sharing, and alerts.
- Subscriber favorites, calendar, exports, multiple users, and mobile access.
- Awards, bidder participation, company comparisons, and competitive intelligence.
- AI summaries and bid prediction, as well as consultancy and adjacent services.

Only public pages were assessed. Authenticated workflows, paid functionality, and underlying data accuracy were not verified. Eligibility, amendment impact, and preparation workflows are proposed advantages to validate, not proven absent features of TenderDetail.

Full TenderDetail parity is the broader inspiration. The agreed POC deliberately limits global coverage, projects, advanced competitive analytics, and service delivery.

## Initial audience

Indian suppliers and contractors who regularly assess and prepare tenders. An electrical equipment/supply-and-installation segment was suggested as a possible pilot, but no final sector or geography was selected. Choose initial coverage according to accessible, useful official data and state the coverage explicitly.

## Functional scope

| Area | Required behavior |
| --- | --- |
| Dashboard | Relevant opportunities, approaching deadlines, active bids, and recent changes |
| Discovery | Keyword search; location, category, authority, value, closing date, and status filters; sorting and pagination |
| Tender details | Scope, authority, reference number, EMD/fees/value where available, dates, source links, document references, and last-checked timestamp |
| Shortlisting | Favorites and private notes |
| Comparison | Side-by-side comparison of selected tenders, including available eligibility and financial information |
| Company profile | Business categories, operating regions, turnover information, certifications, and past experience |
| Eligibility | Requirement-by-requirement assessment with supporting evidence and unresolved items |
| My Bids | Pipeline, checklists, task ownership, internal deadlines, notes, progress, and bid/no-bid decisions |
| Amendments | Version history, before/after comparison, changed fields, and affected tasks |
| Calendar | Tender deadlines and internal preparation deadlines |
| Notifications | In-app updates; no paid email/SMS/WhatsApp delivery |
| Import/export | CSV import, PDF text extraction with review, tender-list export, and bid-checklist export |
| Results | Searchable imported awards and basic summaries where verified data exists |
| Accounts | Lightweight authentication and persistent private workspaces across sessions/devices |

Task ownership does not require implementing a complete enterprise collaboration suite. Invitations, granular organizational roles, and multi-company collaboration are not necessary for the initial POC.

## Differentiating workflows

### Explainable eligibility

Compare confirmed tender requirements with company information using explicit rules. For every requirement show:

1. The requirement and its source clause/page, when available.
2. The company evidence used.
3. An assessment: appears satisfied, not satisfied, or needs review.
4. Missing evidence or a concrete next action.

Missing evidence must not become confirmed ineligibility. Unknown requirements must not become passes. Relevance or eligibility indicators must not be presented as a probability of winning.

Users review and correct extracted requirements before they drive an assessment. The baseline does not depend on a paid LLM or claim reliable automatic interpretation of arbitrary documents.

### Bid preparation workspace

Convert reviewed requirements into checklists/tasks. Track responsibility, deadlines, evidence references, completion, and notes. Allow a bid/no-bid decision with a reason. Export the checklist and link to the official submission portal.

Official bid submission, digital signing, and guaranteed compliant bid generation are outside scope.

### Amendment impact

Preserve imported versions. Compare structured fields and extracted text. Show changes and their source. When a structured requirement changes, flag affected assessments and reopen relevant preparation tasks. Ask users to confirm ambiguous mappings.

Use actual published amendments when available. If only one version exists, display that limitation; do not invent history. Automatic monitoring applies only to supported, successfully tested sources.

## Real-data acquisition

Target an initial collection of approximately **50–100 verified Indian tender records**, subject to access and document availability. Include several records with sufficient material for a full preparation walkthrough. Quantity is a target, not a reason to pad the catalogue with fabricated or unverified content.

### Source strategy

- Evaluate selected official procurement sources first, including CPPP/ePublishing.
- Check access and reuse conditions for each source before relying on automated collection.
- Implement automated adapters only where access is reliable and verified.
- Provide manual and CSV import for unsupported or inaccessible sources.
- Provide real PDF import with text extraction and user-confirmed fields.
- Supported URL imports may fetch records; unsupported URLs remain source references.
- Do not depend on TenderDetail's proprietary database.
- Do not promise nationwide coverage or an unrestricted Indian bulk API.

CPPP publishes notices, corrigenda, and awards. An unrestricted bulk retrieval API was not verified. GeM access failed through the research browser and remains unvalidated, not proven unavailable.

TED's official published-notice search API supports anonymous retrieval and is a possible future international feed. International data must not silently substitute for the Indian coverage users expect.

### Data integrity

- Retain source URL, original reference, publication/closing dates, retrieval time, and import method.
- Store source currency and explicit time zones; do not silently reinterpret amounts or deadlines.
- Distinguish unknown values from zero.
- Deduplicate records while preserving source references and versions.
- Model active, closed, cancelled, and unknown states appropriately.
- Distinguish an expired deadline from a confirmed cancellation or award.
- Display coverage, freshness, and refresh failures clearly.
- Do not fabricate missing bidders, awards, prices, or amendment history.
- Keep imports usable when automated collection fails.

## Interface

Primary navigation: **Overview · Discover · My Bids · Calendar · Results · Company**.

Use a clean desktop-first layout with a sidebar, compact tables, persistent filters, quick previews, clear status indicators, and responsive behavior. Tender pages lead with scope, deadline, financial requirements, eligibility gaps, source freshness, and next action.

Provide loading, empty, error, and unavailable-data states. Every visible action works or clearly explains an actual limitation. Do not render empty navigation for deferred modules.

Separate the shared public tender catalogue from private company financials, uploaded material, notes, and preparation activity.

## Technical architecture

| Layer | Decision |
| --- | --- |
| Application | Next.js with TypeScript |
| UI | Tailwind CSS and accessible reusable components |
| Backend | Server-side API routes |
| Database | MongoDB Atlas Free |
| Authentication | Lightweight authenticated account/session flow |
| Search | Indexed database queries and structured filters |
| Eligibility | Explicit rules operating on user-confirmed requirements |
| PDF processing | Browser-side text extraction for text-based PDFs, followed by review |
| Collection | Separate local refresh/import command writing to Atlas |
| Persistence | Atlas stores catalogue records, versions, company profiles, requirements, tasks, notes, and outcomes |
| Binary files | Official source links; local originals for private uploads; extracted text and metadata in Atlas |

Keep MongoDB credentials server-side and reuse bounded connection pools. Protect private workspace access on the server. Do not place a shared database credential in frontend code.

Large PDF binaries stay outside MongoDB. Private uploaded originals do not automatically sync across devices in this scope; stored extracted text and metadata do. Object storage can be added later if shared original files become necessary.

Scanned PDFs require OCR or manual entry. The base POC must identify extraction failure clearly; comprehensive OCR is not promised.

### Suggested core records

- User and private workspace/company profile.
- Tender and official source references.
- Tender version/amendment.
- Document metadata and extracted text.
- Requirement and supporting source location.
- Company evidence and eligibility assessment.
- Favorite, bid, task, and note.
- Award/result.
- Import run and source refresh status.

Exact schema and library choices are implementation decisions, not a requirement to overbuild an enterprise system.

## Local operation and future Vercel compatibility

Run locally now against Atlas. Include setup instructions and environment-variable examples without secrets.

For possible future Vercel deployment:

- Do not rely on persistent local server files or SQLite.
- Keep requests short; run long collection work locally.
- Browser PDF extraction avoids passing large files through ordinary function endpoints.
- Vercel currently documents a 4.5 MB function request/response payload limit.
- Hobby scheduled jobs run no more than daily per job and lack exact timing.
- Atlas handles persistence; deployment does not itself provide a continuous scraper.
- Hobby is restricted to personal, non-commercial use. A commercial demo may require Pro even without in-app monetization.

Recheck vendor limits before deployment; the above reflects research on 2026-09-11. Do not deploy, provision paid resources, or upgrade plans as part of the current scope.

## Cost target

Target **₹0 additional infrastructure and API charges** for local operation within Atlas Free limits. No paid LLM, scraper, notification service, database, domain, or hosting is required.

This excludes existing subscriptions, model usage outside included allowances, implementation effort, and internet/electricity costs. It is a design target, not a guarantee about future third-party pricing.

Atlas Free has capacity/throughput limits and can pause after 30 days without connections. Verify availability before a presentation following a long idle period. Keep a repeatable import and export path.

## Deferred scope

- Nationwide continuous coverage and guaranteed freshness.
- Global tender coverage and infrastructure project tracking.
- Advanced bidder intelligence, win prediction, and automatic price recommendations.
- Paid AI assistants and fully automatic arbitrary-document eligibility interpretation.
- Comprehensive OCR and automatic BOQ costing.
- External email/SMS/WhatsApp notifications.
- Official bid submission and digital signing.
- Consultancy, financing, and certificate-service delivery.
- Monetization and payments.
- Deployment and external account provisioning.
- Enterprise collaboration, complex roles, and shared binary document storage.

## Delivery sequence

1. Inspect repository instructions and verify practical access to initial official sources.
2. Implement the application, persistence, account access, imports, and core tender workflow.
3. Populate verified real data and complete several detailed end-to-end examples.
4. Implement requirement assessments, bid preparation, and version comparison.
5. Verify user workflows, error handling, privacy boundaries, and persistent data.
6. Prepare setup documentation and a repeatable presentation walkthrough.

Previous discussion estimated 3–7 focused working days for build, data preparation, and rehearsal. This is provisional, not a delivery commitment. Source access is the largest uncertainty.

## Acceptance criteria

- A user signs in and searches, filters, compares, and favorites real tenders.
- A real CSV/PDF import is reviewed and added to a bid pipeline.
- Confirmed requirements produce explainable eligibility assessments.
- Unknown/missing information remains explicitly unresolved.
- Private notes, company details, tasks, deadlines, and bid stages persist across sessions and remain access-controlled.
- Two actual imported versions can be compared without overwriting history.
- Structured changes can flag affected assessments/tasks.
- Exports work and source links/timestamps remain visible.
- Refresh failure does not erase previously imported data or imply a successful update.
- The application has meaningful empty/error states and no fake functional controls.
- Setup, environment configuration, import commands, and a presentation walkthrough are documented.

## Presentation walkthrough

1. Sign in and view the dashboard populated with verified real records.
2. Filter for a relevant opportunity and compare it with another.
3. Open source-backed tender details and review eligibility against a company profile.
4. Shortlist and create a bid with preparation tasks.
5. Show a genuine second document version, if available, and its effects on preparation.
6. Import a new real tender and export a checklist.
7. Reload/sign in again to demonstrate persistence.

Use a clearly identified demonstration company profile if real company information is unavailable. This does not permit fictional tender records or fabricated outcomes. Do not trigger invented amendments on real tenders to improve the presentation.

## Sources and research references

Public pages reviewed during proposal preparation:

- TenderDetail: https://www.tenderdetail.com/
- Advanced search: https://www.tenderdetail.com/Tender/AdvancedSearch
- Subscription feature inventory: https://www.tenderdetail.com/Subscriptions-Benefits
- Competitive analysis: https://www.tenderdetail.com/competitive-bid-analysis
- Results: https://www.tenderdetail.com/Tender-Results
- CPPP: https://eprocure.gov.in/cppp/
- ePublishing: https://eprocure.gov.in/epublish//app
- TED Search API: https://docs.ted.europa.eu/api/latest/search.html
- Atlas Free limits: https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/
- Atlas/Vercel integration: https://vercel.com/marketplace/mongodbatlas/atlas
- Vercel Hobby: https://vercel.com/docs/plans/hobby
- Vercel fair use: https://vercel.com/docs/limits/fair-use-guidelines
- Vercel function limits: https://vercel.com/docs/functions/limitations
- Vercel cron limits: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel SQLite guidance: https://vercel.com/kb/guide/is-sqlite-supported-in-vercel

## Resume guidance

Read this proposal before implementing or revising scope. Preserve the real-data requirement, Atlas decision, zero-cost preference, and local-first delivery. Resolve routine implementation choices autonomously. Never present planned source access, untested functionality, or missing data as verified. Track subsequent material decisions in this document so it remains a useful project reference.

## Implementation update — 11 September 2026

The user chose one-time snapshot operation. The implemented POC uses 77 real ISRO notices in Atlas, including two PDF-verified detailed notices, and supports further private reviewed imports. No continuous API/feed integration is active. Detailed source limits and current implementation behavior are documented in [README.md](README.md) and [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md); these supersede earlier suggestions about automatic monitoring for the current demo.

The preparation, import, version-impact and private-workspace workflows are implemented. No real official amendment pair or award dataset was preloaded; isolated tests verify those mechanisms without fictional demo catalogue records. Use [docs/DEMO_WALKTHROUGH.md](docs/DEMO_WALKTHROUGH.md) for the presentation.
