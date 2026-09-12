"""Package only the public extension files; no credentials or workspace state."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
with ZipFile(root / 'public/biddesk-attachment-extension.zip', 'w', ZIP_DEFLATED) as archive:
    for name in ['manifest.json', 'popup.html', 'popup.js', 'background.js', 'README.md']:
        archive.write(root / 'extension' / name, name)
