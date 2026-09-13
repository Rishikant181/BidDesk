# BidDesk attachment bridge for Chrome

This optional Chrome extension downloads a tender ZIP using your existing TenderHut browser session and transfers its bytes to a paired local BidDesk workspace. TenderHut cookies and access tokens stay in the browser and are never written to extension storage or sent to BidDesk.

## Installation and use

1. Start BidDesk and open its local address, such as `http://localhost:3000`.
2. In **Documents & review → Transfer attachments from the source portal → Set up the Chrome extension**, download and extract the Chrome extension ZIP. Developers can use this repository's `extension` directory directly.
3. Open `chrome://extensions` in Chrome 120 or newer, enable **Developer mode**, select **Load unpacked**, and choose the extracted folder containing `manifest.json`. Pin the extension using Chrome's Extensions menu. Keep the extracted folder in place; after replacing its files with an update, click **Reload** on the extension card.
4. Sign in to `https://tenderhut.in` normally. In BidDesk, choose **Pair attachment extension** and copy the one-use code, valid for ten minutes.
5. Switch to the signed-in TenderHut tab. Open the extension, paste the code, select **Check destination**, and check the tender, bid ID and local destination. Then choose **Download ZIP and transfer**. Keep the popup and TenderHut tab open until completion.
6. Return to BidDesk, select **Review transferred files**, then **Read PDF for review**. Select the document/pages in **Documents & review**, and explicitly start analysis when ready. Other file formats are download-only.

The code authorizes one transfer to one tender/account/version. Generate a fresh code after failure or expiry. If the popup closes during a transfer, first check BidDesk's transferred files before retrying. Source refresh does not download attachments or start AI.

## Limits and storage

This is an unpacked Chrome extension, not a Chrome Web Store listing. Transfers remain local-only (`http://localhost` or `http://127.0.0.1`); hosted destinations are rejected.

ZIP limits: 25 MB compressed, 100 entries, 100 MB expanded total and 20 MB per entry. Encrypted archives, symlinks and nested extraction are rejected. Temporary archives expire after 24 hours and are removed during subsequent attachment operations. PDFs selected for review are retained separately in private document storage; MongoDB stores metadata/text, not the PDF binaries.

To rebuild the downloadable package after editing this directory, run `python3 scripts/package-extension.py` from the repository root.

## Implementation and verification

Manifest V3 uses a Chrome service worker and `chrome.*` APIs. A callback response channel stays open for asynchronous transfers. Download code runs in an isolated content-script world on the TenderHut tab; only file bytes return to the worker. The worker contacts BidDesk with a separate one-use grant and no browser credentials. A bounded transfer keeps the worker active while running; it does not schedule background downloads.

Automated tests use an isolated browser profile, source responses and local workspace data. Real authenticated TenderHut access/entitlement still needs a manual smoke check. If TenderHut denies the download, download normally and upload a selected PDF in BidDesk.

References: [Chrome service workers](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers), [Chrome messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging), [Load unpacked extensions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world).
