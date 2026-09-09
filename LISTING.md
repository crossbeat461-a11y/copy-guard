# Listing copy (for community.obsidian.md → Edit listing)

Paste these values in the developer dashboard.

## Important (automated review)

- **`manifest.json` → `description` must NOT contain the word `Obsidian`.**
- **`authorUrl`** must be a GitHub **profile** URL, not the plugin repository.
- **GitHub Release title** must include the version (e.g. `CopyGuard 1.1.1`). CI sets this on tag push.
- **Release assets** (`main.js`, `manifest.json`, `styles.css`) are published via GitHub Actions with **artifact attestations**.
- Short description: **200 characters or fewer**. Longer description: **1000 characters or fewer** (spaces included).

## Short description

```
Find sync-conflict copies (Proton Drive, official Sync -conflict- names, Dropbox, and similar), empty files, and leftover temp files. Review them and move only what you approve.
```

## Longer description (if available)

```
CopyGuard is a maintenance plugin. It does not delete on its own.

Scan for:
- Sync conflict copies: Dropbox, official Sync (including Note-conflict-YYYY-MM-DD), Proton Drive (# Edit conflict / # Name clash), Syncthing, Nextcloud, and several languages. Listed even if the original is missing from the folder
- When the original is in the same folder, a badge shows if the copy has the same bytes. CopyGuard does not merge
- Empty (0-byte) files older than a number of days you set
- Leftover temp files (.tmp, trailing ~, and similar)

You choose what to move into a vault-root folder (default: K-Tech Trash Box). Deleting those files is a second step, with a confirm dialog. Default is not to delete.

The UI follows the app language (Japanese, English, German, Korean, Simplified Chinese, Traditional Chinese, Spanish, Portuguese). Fully local except Buy Me a Coffee, which opens in the browser if you click it.
```

## Suggested categories / tags

- Files
- Utility
