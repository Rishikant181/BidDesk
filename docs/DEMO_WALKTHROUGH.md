# BidDesk demo walkthrough

Current flow: 12 September 2026. Start with `npm run dev`, then open `http://localhost:3000`. Keep the configured `.env.local`; snapshot import is not required.

## 1. Discovery

Sign in or create an account. Discovery loads public the source portal results immediately. Search for an offering, narrow by state/category/value or use the source/buyer filters, and change pages. Point out the source retrieval time and original-source links. Reloading/navigation rechecks the source; leaving the page open does not poll. Export contains the displayed page only.

## 2. Match the company

Open Company profile. Save a public/non-sensitive capability description, offerings and regions. Return to discovery → **Find tenders matching my profile**. Approve the selected input and run matching.

Show search terms, retrieved/prepared counts, match reasons and source excerpts. The app searches upstream before ranking; it does not promise an exhaustive search, qualification or win probability. A quota failure leaves retrieved opportunities available in basic relevance order.

## 3. Review and prepare

Open a result. Its public HTML page is fetched and available fields refreshed. Inspect **Source fields and observation dates**, then **Open official tender**. A generic portal may require finding the displayed reference manually.

Save the tender, add private notes, and start bid preparation. Add tasks, owners and internal deadlines. Eligibility remains unknown until supported requirements and evidence are reviewed. Source content changes preserve a version and can flag preparation work.

## 4. Optional attachments and AI review

Manual route: download a public PDF normally, then use Analysis → Upload a PDF instead. Select pages, click Analyze with Gemini, review exact excerpts and save selected private findings. Eligibility review compares confirmed requirements to selected company evidence; human judgments remain separate.

Extension route: Documents → **Set up the Firefox extension**. Download/extract its package and temporarily install `manifest.json` through Firefox's `about:debugging`. Sign in to the source portal. Generate a BidDesk pairing code, paste it into the extension on the the source portal tab, check the destination/tender and explicitly transfer the ZIP. Return to BidDesk → **Review transferred files**, select a PDF to read, then proceed through the same AI review. Unsupported file types are download-only.

The real authenticated Firefox download needs a manual smoke check before presenting this optional route. Keep manual PDF upload ready as fallback. Do not paste the source portal cookies or tokens into BidDesk, chat or configuration.

## What to explain honestly

- Source availability and its own scraping schedule determine freshness. BidDesk does not continuously monitor official portals.
- Missing financial, eligibility or document fields remain unknown; a date-only deadline does not establish an exact time.
- Matching analyzes a bounded retrieved set. It is not eligibility approval.
- Private archive files are temporary local storage; extracted text/findings stay private in Atlas.
- No official bid submission, exhaustive award database, hosted deployment or monetization is included.
