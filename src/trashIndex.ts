import { App, normalizePath, TFile } from "obsidian";
import { parseTrashIndex, serializeTrashIndex, TRASH_INDEX_NAME } from "./trashIndexParse";

export { parseTrashIndex, serializeTrashIndex, TRASH_INDEX_NAME } from "./trashIndexParse";

function normalizeFolder(path: string): string {
	return normalizePath(path).replace(/\/+$/, "");
}

export function trashIndexPath(trashFolderName: string): string {
	return normalizePath(`${normalizeFolder(trashFolderName)}/${TRASH_INDEX_NAME}`);
}

export function isTrashIndexPath(filePath: string, trashFolderName: string): boolean {
	return filePath === trashIndexPath(trashFolderName);
}

export async function loadTrashIndex(app: App, trashFolderName: string): Promise<Map<string, string>> {
	const path = trashIndexPath(trashFolderName);
	const abstract = app.vault.getAbstractFileByPath(path);
	if (!(abstract instanceof TFile)) return new Map();
	try {
		const raw = await app.vault.read(abstract);
		const parsed: unknown = JSON.parse(raw);
		return parseTrashIndex(parsed);
	} catch {
		return new Map();
	}
}

export async function saveTrashIndex(
	app: App,
	trashFolderName: string,
	map: Map<string, string>
): Promise<void> {
	const path = trashIndexPath(trashFolderName);
	const existing = app.vault.getAbstractFileByPath(path);
	if (map.size === 0) {
		if (existing instanceof TFile) {
			await app.fileManager.trashFile(existing);
		}
		return;
	}
	const body = serializeTrashIndex(map);
	if (existing instanceof TFile) {
		await app.vault.modify(existing, body);
		return;
	}
	if (existing) {
		throw new Error(`Cannot write restore index; a folder occupies ${path}`);
	}
	await app.vault.create(path, body);
}
