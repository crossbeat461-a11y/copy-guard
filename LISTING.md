# Listing copy (for community.obsidian.md → Edit listing)

Paste these values in the developer dashboard.

## Important (automated review)

- **`manifest.json` → `description` must NOT contain the word `Obsidian`.**
- **`authorUrl`** must be a GitHub **profile** URL, not the plugin repository.
- **GitHub Release title** must include the version (e.g. `CopyGuard 1.0.0`). CI sets this on tag push.
- **Release assets** (`main.js`, `manifest.json`, `styles.css`) are published via GitHub Actions with **artifact attestations**.

## Short description

```
Find sync-conflict copies, empty files, and leftover temp files in the same folder, review them, and move only what you approve into a dedicated trash folder before deleting.
```

## Longer description (if available)

```
CopyGuard is a maintenance plugin. It does not delete on its own.

Scan for:
- Sync conflict copies (Dropbox / official Sync / Syncthing / Nextcloud name patterns; several languages). Listed even if the original is missing from the folder
- Empty (0-byte) files older than a number of days you set
- Leftover temp files (.tmp, trailing ~, and similar)

You choose what to move into a vault-root folder (default: K-Tech Trash Box). Deleting those files is a second step, with a confirm dialog. Default is not to delete.

The UI follows the app language (Japanese, English, German). Fully local except Buy Me a Coffee, which opens in the browser if you click it.
```

## Suggested categories / tags

- Files
- Utility
