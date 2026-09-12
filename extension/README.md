# BidDesk attachment bridge (Firefox)

The core BidDesk app works without this extension. This optional local extension downloads a ZIP using your existing source portal session and transfers file bytes to your paired private workspace. No source portal cookie or access token is sent to BidDesk or written to extension storage.

## Local installation and use

1. Start BidDesk with `npm run dev` and use `http://localhost:3000`.
2. In Firefox open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select this directory's `manifest.json`. Temporary add-ons disappear when Firefox restarts.
3. Sign in to source portal normally in a tab. Do not paste credentials into BidDesk or the extension.
4. Open a source portal tender in BidDesk → **Documents** → **Pair attachment extension**. Copy the one-use pairing code (valid for ten minutes).
5. Switch to the signed-in source portal tab. Open the extension, paste the code and choose **Check destination**. Check the tender, bid ID and local destination before choosing **Download ZIP and transfer**.
6. On success, return to BidDesk and choose **Review transferred files**. Choose **Read PDF for review**, then select the document/pages and consent before running Gemini. Unsupported files can be downloaded but are not executed or analyzed.

The pairing code authorizes one upload to one tender in your workspace. Treat it as private. Generate a fresh code after failure/expiry. Normal source refresh never downloads attachments or runs AI. The extension uses fixed source portal routes, not an arbitrary URL relay.

ZIPs: 25 MB compressed, 100 entries, 100 MB total expanded, 20 MB per entry. No nested extraction, encrypted archives or symlinks. Temporary extracted files expire after 24 hours and are removed on a subsequent attachment operation. Extracted PDF text is retained privately for review. Atlas does not store PDF binaries.

## Verification limits

Public source paths and the local pairing/ZIP/PDF flow are tested independently. Authenticated downloading in your actual Firefox/source portal session still requires a manual smoke check; captured tokens are never replayed. If session-bound fetch fails or the source denies access, download normally and upload a selected PDF through BidDesk's Analysis tab. No paid entitlement is assumed. Chrome packaging and hosted deployment are not included.

The implementation uses Firefox content-script execution with the existing page session. References: [MDN content scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts), [MDN scripting.executeScript](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/executeScript). Only downloaded bytes leave that execution context; the local transfer is performed by the extension background script with a separate BidDesk grant.
