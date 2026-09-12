# BidDesk demo walkthrough

Allow about 8–10 minutes. Start Atlas connectivity and the local app before presenting. See README for commands. Use a real account and your own company information; there is no prebuilt fictional workspace.

## 1. Introduce the scope

“BidDesk helps an Indian supplier discover tenders, review the requirements, and prepare a bid in one workspace. This POC uses 77 real ISRO notices captured on 11 September 2026. It is a snapshot; the official source must be checked before bidding.”

Show Overview and its source date. Counts are calculated from imported records and private preparation activity. Empty metrics are expected in a new account.

## 2. Find and compare opportunities

Open Discover. Search `RFSoC` for the verified PRL supply notice. Open Quick preview, then the full notice. Show the official reference, due time, and original PDF link. Its missing value remains “Not published.”

Search `5154` for the SAC lab partition work. Show INR 4.27 lakh, INR 8,540 EMD, original source, and source notes. Use Gujarat or Civil works filters. Save both opportunities, clear filters, then use Saved and select the two comparison checkboxes. Compare financial commitments, deadlines and any reviewed eligibility requirements. Export the list to CSV.

The rest of the listing includes reference-based titles; explain that broad metadata import and detailed document review are separate steps.

## 3. Prepare a real bid

Enter your company profile, regions, and documented past work. Do not invent financial evidence for a passing indicator.

Open the SAC notice → Eligibility → Review requirements. Read NIT pages 2–3 in the official source. The similar-work requirement is a composite condition with alternatives; the correct automated outcome is “needs review.” Confirm the source reference only after reviewing it. Review the EMD/exemption task against clauses 4 and 6.

Select Start preparing this bid. Assign responsibility, add an internal deadline, and retain document references in task notes. Choose a pipeline stage and record a bid/no-bid rationale. Save changes, reload to demonstrate persistence, and export the checklist. Marking a task complete means preparation progress, not official qualification.

Show Calendar and My Bids. Personal submitted/won/lost stages are not official procurement awards.

## 4. Bring in another real notice

Download a text PDF from its official source beforehand. Open Import a tender → Read a PDF. The browser extracts page text locally. Expand the extracted pages, enter the actual title/reference/source and dates, then confirm the reviewed information and import it. Open the private record and its Documents tab.

For spreadsheets, use Import a spreadsheet → Download CSV header template. Map columns, review row validation, then import. Repeating the same source/reference/content is reported unchanged.

A scanned/no-text PDF needs manual entry; OCR is outside this demo. Original PDF binaries stay on the device; extracted text and reviewed metadata persist across sessions.

## 5. Explain amendment handling honestly

A private tender offers Import amendment. With a genuine later notice, preserve source/reference, enter the changed details, and import the new version. Changes shows before/after fields and document text. Changed linked requirements reopen affected preparation tasks and notify watchers. Retrying an unchanged version does not repeat those effects.

No genuine official amendment pair was preloaded. Do not invent a corrigendum live. If you need to demonstrate this mechanism without a real pair, explicitly identify the separate automated test fixture; it is not present in the shared catalogue. The two enriched catalogue notices' extra versions in this checkout are metadata improvements, labelled accordingly.

## 6. Close with provenance and persistence

Show Tender results: it truthfully starts empty because no award dataset was verified. The import/search workflow supports original published award notices. Show notifications if a real imported update exists, then sign out/sign back in to demonstrate the private workspace.

Do not run data collection, refresh the source snapshot, delete database records, or change infrastructure during the presentation. Data access requires internet for Atlas; original document links also require the source website to be reachable.

## Optional Gemini presentation

Configure the server key and run the live checks in [Gemini implementation notes](GEMINI_IMPLEMENTATION_NOTES.md) before presenting AI output. Until then the real workspace shows setup/errors, not simulated model results.

Save a public/non-sensitive capability profile, open an existing tender, and choose **Analyze documents → Read document**. Select readable pages and approve sending their text to Gemini. Review exact citations before saving selected private findings. Show the Eligibility evidence review and a separate human judgment, then demonstrate **AI recommendations** with the prepared real scope excerpts. Explain the displayed matching coverage and the dated snapshot. Supporting evidence and semantic relevance are not qualification guarantees.
