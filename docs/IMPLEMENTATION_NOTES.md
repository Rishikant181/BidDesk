# Implementation notes

## Product direction — 12 September 2026

**TenderHut is the only tender source.** Nothing has reached production or been finalized. The user explicitly directs that every iteration be treated as fresh, with no backward-compatibility requirements. Do not restore alternate sources, standalone tender imports, manual award feeds or migration layers from Git history.

Read [TENDERHUT_IMPLEMENTATION_NOTES.md](TENDERHUT_IMPLEMENTATION_NOTES.md) for the current code map and limits and [UI_FUNCTIONALITY_AUDIT.md](UI_FUNCTIONALITY_AUDIT.md) for the earlier audit and current disposition.

## Matching results header cleanup — latest iteration

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
