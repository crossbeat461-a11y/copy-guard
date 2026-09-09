/** Proton Drive: `Note (# Edit conflict 2025-08-17 id #) (# Name clash … #)` */
const PROTON_DRIVE_SUFFIX =
	/\s*[（(]\s*#\s*(?:Edit conflict|Name clash)\s+[^）)]*[）)]\s*$/i;

/** Official Sync: `Note-conflict-2026-08-31` or `Note-conflict-2026-08-31-123456` */
const OFFICIAL_SYNC_HYPHEN =
	/^(.*?)-conflict-\d{4}-\d{2}-\d{2}(?:-\d{2,6})?(?:-\d{2}){0,2}$/i;

/**
 * Strip every trailing Proton Drive `(# Edit conflict …)` / `(# Name clash …)` group.
 * Returns the original base name, or null if nothing was stripped.
 */
export function stripProtonDriveSuffixes(basename: string): string | null {
	let current = basename.trim();
	let stripped = false;
	while (PROTON_DRIVE_SUFFIX.test(current)) {
		current = current.replace(PROTON_DRIVE_SUFFIX, "").trim();
		stripped = true;
	}
	if (!stripped || current.length === 0) return null;
	return current;
}

/**
 * Strip official Sync `-conflict-YYYY-MM-DD` (optional time).
 * Returns the original base name, or null if it does not match.
 */
export function stripOfficialSyncHyphenConflict(basename: string): string | null {
	const m = basename.match(OFFICIAL_SYNC_HYPHEN);
	if (!m || m[1].trim().length === 0) return null;
	return m[1].trim();
}
