# Source fixtures

`tenderhut-list.json` is a two-row anonymous public `/bids?sort_by=end_date&sort_dir=asc&limit=2&offset=0` response captured on 12 September 2026.

`tenderhut-detail.html` is the public BPCL `1000464360` page; `tenderhut-rich-detail.html` is the public AAI `2026-aai-288117-1` page. Styles, scripts and unrelated search/related-tender sections were stripped for compact parser fixtures. The source canonical URLs remain in the files. No credentials are included.

`src/lib/tenderhut/test-source.ts` creates explicitly labeled synthetic search variations for integration tests. It can run only with `BIDDESK_SOURCE_TEST_FIXTURES=1` and a random `biddesk_test_<16 hex>` database. These fixture variations must never be imported into a real workspace.
