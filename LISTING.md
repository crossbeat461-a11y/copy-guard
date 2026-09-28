# Listing copy (for community.obsidian.md → Edit listing)

Paste these values in the developer dashboard.

## Important (automated review)

- **`manifest.json` → `description` must NOT contain the word `Obsidian`.**
- **`authorUrl`** must be a GitHub **profile** URL, not the plugin repository.
- **GitHub Release title** must include the version (e.g. `CopyGuard 1.3.0`). CI sets this on tag push.
- **Release assets** (`main.js`, `manifest.json`, `styles.css`) are published via GitHub Actions with **artifact attestations**.
- Short description: **200 characters or fewer**. Longer description: **1000 characters or fewer** (spaces included).

## Short description

```
Find sync-conflict copies, empty files, and leftover temp files. Compare with the original (name-only if bytes match). Restore from the Trash Box. Two-step delete. Does not merge.
```

## Longer description (if available)

```
CopyGuard is a maintenance plugin. It does not delete on its own. It does not merge.

Scan for:
- Sync conflict copies (Dropbox, official Sync -conflict- names, Proton Drive, Syncthing, Nextcloud, several languages). Listed even if the original is missing
- When the original is in the same folder, compare each row. Matching bytes show as name-only. Select identical copies checks only those
- Restore indexed files from the Trash Box to the original path. Occupied paths are skipped (no overwrite). Pre-1.3.0 quarantines cannot restore to the original path
- Empty (0-byte) files older than a number of days you set
- Leftover temp files (.tmp, trailing ~, and similar)

Move only what you approve into a vault-root folder (default: K-Tech Trash Box). Deleting is a second step. Default is not to delete. Numbered duplicates stay off by default.

UI follows the app language (Japanese, English, German, Korean, Simplified/Traditional Chinese, Spanish, Portuguese). Local except Buy Me a Coffee.
```

## Suggested categories / tags

- Files
- Utility
