# BidDesk source coverage

## Selected data mode

User decision on 11 September 2026: continue with the planned **one-time real snapshot**. No API integrations, reverse-engineered endpoints, continuous monitoring, scheduled collection, or nationwide freshness claim.

## Shared catalogue

| Source | Coverage | Acquisition | Snapshot |
| --- | --- | --- | --- |
| [ISRO consolidated tender register](https://www.isro.gov.in/Tenders.html) | 77 Indian departmental/institutional advertisement records | Public HTML metadata with original PDF links; repeatable local parser | 2026-09-11T11:16:29.140Z |
| [SAC NIT 58](https://www.isro.gov.in/media_isro/pdf/Tenders/2026/NIT58_10092026.pdf) | One existing record enriched with actual scope, amount, EMD, deadline, and draft requirement references | Manual check of original PDF pages 1–4 | 11 September 2026 |
| [PRL PT-18](https://www.isro.gov.in/media_isro/pdf/Tenders/2026/NIT_PT_18_07092026.pdf) | One existing record enriched with RFSoC Board title, GeM reference, and exact published due time | Original PDF page 1 | 11 September 2026 |

Attribution: **Department of Space / Indian Space Research Organisation**. Source reuse statement: [ISRO copyright policy](https://www.isro.gov.in/Copyright_Policy.html). The committed catalogue contains public notice metadata and brief descriptions; it does not bundle original PDFs, third-party attachments, or user material. Preserve attribution when reusing the snapshot.

`data/public/manifest.json` records the source URL, count, retrieval date, and SHA-256 of the complete UTF-8 `isro-tenders.json` file. Collection does not imply that every linked document was extracted or every record remains open. An advertisement can cover several procurement lots; the record represents the advertisement, not a fabricated separate tender for each lot.

## Verification and interpretation

- **SAC/CMG/CPHD/C/e/58/2026-27:** partition in lab 5154, Building 51, SAC Ahmedabad. NIT page 1 publishes INR 4.27 lakh and two-month completion period; page 2 publishes INR 8,540 EMD and submission by 25 September 2026 at 17:00. Notice date is 31 August. Similar-work alternatives and cost escalation need manual review; no simplistic automatic experience pass is issued.
- **PRL/PURCHASE/PT-18/26-27:** RFSoC Board, GeM reference GEM/2026/B/7990985. Page 1 publishes due date 1 October 2026 at 11:00 and GeM-only online submission. The advertisement does not publish estimated value or full qualification requirements.
- **Remaining 75 records:** official references, advertisers, links and advertised windows were retained. Titles deliberately identify the issuing centre/reference. Categories are Unclassified, missing monetary values are null, and location describes the advertiser address unless the original work site was checked.
- Listing windows can mean advertisement/download availability and can differ from individual submission deadlines. Every listing-only record carries that warning. A future window is labelled “upcoming deadline”; it is not independent confirmation that a procurement is active.
- Date-only values retain their precision. Date-derived closure is separate from source-reported cancellation or award.
- The two PDF checks enrich the original metadata. The existing demo database consequently has an extra imported version for those two notices. These are **not official amendments**; their source notes explain that distinction. A fresh snapshot import has one version per notice.

No genuine official amendment pair or award dataset was established for this handoff. Their interfaces remain usable with real user imports. Amendment, notification and award edge cases belong in the isolated test database. Do not present test fixtures as procurement opportunities.

## Other sources

CPPP/ePublishing was evaluated during planning; no robust nationwide adapter is shipped. GeM is linked from original notices but is not scraped. Documented API research is retained in `TENDER_API_RESEARCH.md` for future consideration. No international feed is active. Users may manually import a notice from another country with its source and currency retained.

## Refresh and provenance behavior

The normal demo uses the committed snapshot. User imports are private. Only the trusted local JSON import publishes shared records. Duplicate identity is owner + source + reference; preserve a lot identifier in the reference when entering separate lots. An identical import updates its supplied check timestamp but creates no new version. Different content preserves the prior snapshot and records preparation impacts atomically. Reverting to earlier content creates another observation, rather than erasing intermediate history.

`data:refresh -- --source isro` is an optional explicit maintenance command. A failed source fetch records failure and retains previous records and their retrieval timestamps. Disappearing rows are not deleted. Listing refresh does not perform PDF enrichment and may replace enriched fields; review a new snapshot before using it. No command is invoked periodically or from a user page request.
