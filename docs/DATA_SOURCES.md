# Source coverage

TenderHut (`https://tenderhut.in`) is BidDesk's only tender discovery and detail source. Public listing JSON supplies discovery/filter metadata; rendered detail HTML supplies additional normalized facts. The source's original-portal link remains authoritative for bid decisions.

Originating portals listed in filters are facets of the provider's feed, not independent BidDesk integrations. There is no bundled catalogue, alternate scraper, manual notice/award ingestion or scheduled synchronization. Retained and saved views contain provider records already materialized by discovery/detail/matching operations.

Optional attachment transfer uses the user's authenticated source session in Chrome. Credentials remain in the browser. A user may instead upload a PDF against an existing tender for private review; this does not create a new notice or overwrite public facts.

Retrieval timestamps establish when a response was observed, not nationwide completeness or an official publication/amendment date. Unknown values remain unknown. Source versions represent observed changes, not a complete official corrigenda archive. Matching coverage is a bounded retrieved subset. No award feed is integrated.

Tests use labelled, isolated fixtures under `tests/fixtures/`. They are never a public discovery fallback and cannot run against the normal workspace database.
