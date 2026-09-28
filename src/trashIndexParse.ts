export const TRASH_INDEX_NAME = ".copyguard-index.json";

/** trashPath → original vault path. Invalid JSON yields an empty map (do not guess). */
export function parseTrashIndex(data: unknown): Map<string, string> {
	const map = new Map<string, string>();
	if (data === null || typeof data !== "object") return map;
	const rec = data as Record<string, unknown>;
	const files = rec.files;
	if (files === null || typeof files !== "object" || Array.isArray(files)) return map;
	const entries = files as Record<string, unknown>;
	for (const key of Object.keys(entries)) {
		const value = entries[key];
		if (key.length > 0 && typeof value === "string" && value.length > 0) {
			map.set(key, value);
		}
	}
	return map;
}

export function serializeTrashIndex(map: Map<string, string>): string {
	const files: Record<string, string> = {};
	for (const [trashPath, originalPath] of map) {
		files[trashPath] = originalPath;
	}
	return JSON.stringify({ version: 1, files }, null, 2);
}
