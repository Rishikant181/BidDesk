# Documented tender APIs — research notes

Researched: 2026-09-11. Scope: public documentation, prioritizing Indian tender discovery for BidDesk. No provider accounts were created, paid services purchased, or adapters integrated during this research.

## Conclusion

Documented public retrieval APIs exist for several procurement markets. No generally accessible official nationwide CPPP/GeM tender-search API was verified. This is a search finding, not proof that such an API or restricted partner service cannot exist.

For an India-focused free POC, investigate the World Bank Procurement Notice dataset's India subset as an additional source. Its coverage is World Bank financed projects, not all Indian procurement. Continue official-source imports for other coverage. EU TED and UK open-data APIs are strong future international options, not automatic scope changes.

## Findings

| Source | Documentation and access | Coverage / limitation | Verification |
| --- | --- | --- | --- |
| World Bank Procurement Notice | Official Finances One API explorer, field definitions, pagination, and unauthenticated request examples | World Bank financed projects worldwide; country fields allow India selection. Dataset lists daily updates and CC BY 4.0. Does not cover all Indian tenders. | Documentation reviewed. Separately linked legacy procurement API returned JSON without credentials. New API country filtering and recent Indian results not yet integration-tested. |
| EU TED Search API | Official public API; published-notice search does not require authentication | Notices published on TED, including European procurement; not all procurement in every European country | Official documentation reviewed; POST call not executed in this research |
| UK Find a Tender OCDS | Official data-output documentation; OCDS JSON and XML data under Open Government Licence | Notices in Find a Tender; separate from authenticated eSender submission API | Documentation found; endpoint attempts failed through browsing tool, including a 403. Runtime access unverified. |
| UK Contracts Finder OCDS | Official search/release/record and daily CSV endpoint documentation | Contracts Finder notices; distinct coverage from Find a Tender | Documentation reviewed; sample endpoint failed through browsing tool. Runtime access unverified. |
| US SAM.gov Get Opportunities | Official public API requiring a SAM.gov API key; role-based request quotas | US federal opportunity notices; latest version. Docs describe daily active-notice and weekly archived-notice updates | Documentation reviewed; no key obtained and no authenticated calls made |
| India CPPP/GePNIC | Official material mentions pre/post-tender API integration | Described pre-tender flow pushes departmental SAP/ERP data to the procurement system; not an open third-party catalogue feed | No public read/search API specification verified |
| India GeM | Public tender browsing and integration references | No documented open nationwide bid-retrieval API verified | No public read/search specification verified |
| data.gov.in Assam procurement | Historical catalogues and resource API pages exist | Found historical 2016–2022 data, not a current nationwide feed | Specific 2021–22 API page search extract says API does not exist/request API and includes a sandbox notice; direct fetch failed. Do not treat as a verified working endpoint. |
| TendersOnTime | Public API documentation; username + key required; posting-date retrieval | Commercial service with scope configured by provider; daily synchronization model | Documentation and terms reviewed. Free API access/pricing not established. General terms prohibit competing tender portals; BidDesk would need an explicit suitable license. |
| Third-party scraper services | Apify/OpenAPI and other commercial wrappers surfaced | Wrappers around portal scraping, not official government public APIs | Not tested or selected; underlying access and coverage still need validation |

## Useful documented endpoints

### World Bank

API explorer: https://financesone.worldbank.org/api-explorer?id=DS00979

Documented example:

```text
GET https://datacatalogapi.worldbank.org/dexapps/fone/api/apiservice?datasetId=DS00979&resourceId=RS00909&top=100&type=json
```

The explorer documents country_name, country_code, bid_description, deadline_date, notice_type, procurement_category, procurement_method, project_id, publication_date and url, plus top/skip pagination. Check the explorer-generated country filter before implementing it. The service recommends bulk JSON for datasets below one million rows, so a one-time import may be better than repeated page calls.

Dataset: https://financesone.worldbank.org/procurement-notice/DS00979

Legacy API explicitly linked by World Bank: https://search.worldbank.org/api/procnotices

The base legacy URL returned procurement JSON during research, including historical records. That response does not verify latest-first ordering or current Indian coverage. Trial parameterized requests failed through the browsing tool; they are not a validated contract.

### TED

```text
POST https://api.ted.europa.eu/v3/notices/search
```

Documentation: https://docs.ted.europa.eu/api/latest/search.html

### UK

```text
GET https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages
GET https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search
```

Use published-data outputs, not the authenticated notice-submission APIs.

- https://www.find-tender.service.gov.uk/Developer/Documentation
- https://www.find-tender.service.gov.uk/apidocumentation/1.0/GET-ocdsReleasePackages
- https://www.contractsfinder.service.gov.uk/apidocumentation

### SAM.gov

```text
GET https://api.sam.gov/opportunities/v2/search
```

Requires api_key and postedFrom/postedTo, with other filters and pagination documented at https://open.gsa.gov/api/get-opportunities-public-api/ . Avoid placing keys in logs or committed example URLs.

## India evidence and commercial-provider references

- CPPP annual report describing integration direction: https://eprocure.gov.in/cppp/sites/default/files/eproc/Annualreports/Annual_Report_2022_23.pdf
- GeM-CPPP overview: https://eprocure.gov.in/cppp/sites/default/files/eproc/GemCPPP.pdf
- data.gov.in tender catalogue: https://www.data.gov.in/keywords/Tender
- Assam historical API page: https://data.gov.in/apis/48571d3f-38c8-4cba-b94f-fa12dddbdcdf
- TendersOnTime API: https://www.tendersontime.com/tenders/api-documentation/
- TendersOnTime terms: https://www.tendersontime.com/terms/

## Next integration check, if selected

1. Fetch a small response using the documented request format.
2. Verify country selection and publication/deadline meaning against original notices.
3. Determine whether the records are active, historical, amended, or awards.
4. Inspect missing fields and document links; do not equate metadata with complete bid documents.
5. Confirm reuse attribution and access limits.
6. Add an adapter only after the test succeeds; retain provenance and observed timestamps.

The user's current data decision remains **import once for now**. Discovering APIs does not authorize a scope change to international coverage or continuous polling.
