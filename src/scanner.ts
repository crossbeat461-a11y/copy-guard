import { App, normalizePath, TFile, TFolder } from "obsidian";
import { formatAge, t } from "./i18n";
import type { CopyGuardSettings } from "./settings";

export type CandidateType = "conflict" | "empty" | "temp";

export interface ScanCandidate {
	type: CandidateType;
	file: TFile;
	reason: string;
	/** For conflicts, the vault-relative path of the original file it was matched against. */
	pairPath?: string;
}

interface ConflictPattern {
	id: string;
	risky: boolean;
	label: () => string;
	/** Returns the stripped base name (without extension) if the basename matches, else null. */
	strip: (basename: string) => string | null;
}

const CONFLICT_PATTERNS: ConflictPattern[] = [
	{
		id: "conflicted-copy-en",
		risky: false,
		label: () =>
			t(
				"conflicted copy（Dropbox / iCloud / Obsidian Sync）",
				"conflicted copy (Dropbox / iCloud / Obsidian Sync)",
				"conflicted copy (Dropbox / iCloud / Obsidian Sync)"
			),
		strip: (basename) => {
			const m = basename.match(/^(.*?)\s*\(conflicted copy[^)]*\)\s*$/i);
			return m && m[1].trim().length > 0 ? m[1].trim() : null;
		},
	},
	{
		id: "conflicted-copy-ja",
		risky: false,
		label: () => t("競合コピー（日本語）", "conflict copy (Japanese)", "Konfliktkopie (Japanisch)"),
		strip: (basename) => {
			const m = basename.match(/^(.*?)[（(]\s*競合コピー[^）)]*[）)]\s*$/);
			return m && m[1].trim().length > 0 ? m[1].trim() : null;
		},
	},
	{
		id: "conflicted-copy-de",
		risky: false,
		label: () => t("Konfliktkopie（ドイツ語）", "conflict copy (German)", "Konfliktkopie (Deutsch)"),
		strip: (basename) => {
			const m1 = basename.match(/^(.*?)\s*\([^)]*konfliktkopie[^)]*\)\s*$/i);
			if (m1 && m1[1].trim().length > 0) return m1[1].trim();
			const m2 = basename.match(/^(.*?)\s*\([^)]*in konflikt stehende kopie[^)]*\)\s*$/i);
			if (m2 && m2[1].trim().length > 0) return m2[1].trim();
			return null;
		},
	},
	{
		id: "sync-conflict",
		risky: false,
		label: () => t("sync-conflict（Syncthing）", "sync-conflict (Syncthing)", "sync-conflict (Syncthing)"),
		strip: (basename) => {
			const m = basename.match(/^(.*?)\.sync-conflict-\d{8}-\d{6}-[a-z0-9]+$/i);
			return m && m[1].trim().length > 0 ? m[1].trim() : null;
		},
	},
	{
		id: "numbered-duplicate",
		risky: true,
		label: () =>
			t(
				"番号付きの重複（iCloud / Windows）",
				"numbered duplicate (iCloud / Windows)",
				"nummeriertes Duplikat (iCloud / Windows)"
			),
		strip: (basename) => {
			const m1 = basename.match(/^(.*?)\s+\d+$/);
			if (m1 && m1[1].trim().length > 0) return m1[1].trim();
			const m2 = basename.match(/^(.*?)\s*\(\d+\)$/);
			if (m2 && m2[1].trim().length > 0) return m2[1].trim();
			return null;
		},
	},
];

const TEMP_NAME_PATTERNS: RegExp[] = [
	/\.tmp$/i,
	/~$/,
	/^~\$/,
	/\.crdownload$/i,
	/\.part$/i,
];

function isPlaceholderOrHidden(file: TFile): boolean {
	if (file.extension.toLowerCase() === "icloud") return true;
	if (file.name.startsWith(".")) return true;
	return false;
}

function getOpenFilePaths(app: App): Set<string> {
	const paths = new Set<string>();
	app.workspace.iterateAllLeaves((leaf) => {
		const file = (leaf.view as { file?: TFile }).file;
		if (file?.path) paths.add(file.path);
	});
	return paths;
}

function folderPath(file: TFile): string {
	return file.parent ? file.parent.path : "";
}

function normalizeFolder(path: string): string {
	return normalizePath(path).replace(/\/+$/, "");
}

function isWithinFolder(filePath: string, folder: string): boolean {
	const f = normalizeFolder(folder);
	if (f === "" || f === "/") return true;
	return filePath === f || filePath.startsWith(f + "/");
}

/** Applies scope + exclude folder settings to the full file list. */
export function getScopedFiles(app: App, settings: CopyGuardSettings): TFile[] {
	const trash = normalizeFolder(settings.trashFolderName);
	const excludes = [trash, ...settings.excludeFolders.map(normalizeFolder)];
	const scopes = settings.scanFolders.map(normalizeFolder);

	return app.vault.getFiles().filter((file) => {
		const path = file.path;
		if (excludes.some((ex) => isWithinFolder(path, ex))) return false;
		if (scopes.length > 0 && !scopes.some((sc) => isWithinFolder(path, sc))) return false;
		return true;
	});
}

export function scanConflicts(settings: CopyGuardSettings, files: TFile[]): ScanCandidate[] {
	const candidates: ScanCandidate[] = [];
	const patterns = CONFLICT_PATTERNS.filter((p) => settings.includeNumberedDuplicates || !p.risky);

	const byFolder = new Map<string, TFile[]>();
	for (const f of files) {
		const folder = folderPath(f);
		const list = byFolder.get(folder);
		if (list) list.push(f);
		else byFolder.set(folder, [f]);
	}

	for (const f of files) {
		for (const pattern of patterns) {
			const strippedBase = pattern.strip(f.basename);
			if (!strippedBase) continue;
			const siblings = byFolder.get(folderPath(f)) ?? [];
			const pair = siblings.find(
				(s) => s.path !== f.path && s.basename === strippedBase && s.extension === f.extension
			);
			if (pair) {
				candidates.push({
					type: "conflict",
					file: f,
					reason: `${pattern.label()} → ${t("元", "original", "Original")}: ${pair.name}`,
					pairPath: pair.path,
				});
				break;
			}
		}
	}
	return candidates;
}

export function scanEmptyFiles(app: App, settings: CopyGuardSettings, files: TFile[]): ScanCandidate[] {
	const now = Date.now();
	const thresholdMs = settings.emptyMinAgeDays * 24 * 60 * 60 * 1000;
	const extensions = new Set(settings.emptyExtensions.map((e) => e.toLowerCase()));
	const openPaths = getOpenFilePaths(app);

	return files
		.filter((f) => extensions.has(f.extension.toLowerCase()))
		.filter((f) => f.stat.size === 0)
		.filter((f) => now - f.stat.mtime >= thresholdMs)
		.filter((f) => !openPaths.has(f.path))
		.map((f) => ({
			type: "empty" as const,
			file: f,
			reason: t(
				`0バイト（更新から${formatAge(now - f.stat.mtime)}）`,
				`0 bytes (modified ${formatAge(now - f.stat.mtime)} ago)`,
				`0 Byte (geändert vor ${formatAge(now - f.stat.mtime)})`
			),
		}));
}

export function scanTempFiles(app: App, settings: CopyGuardSettings, files: TFile[]): ScanCandidate[] {
	const now = Date.now();
	const thresholdMs = settings.tempMinAgeDays * 24 * 60 * 60 * 1000;
	const openPaths = getOpenFilePaths(app);

	return files
		.filter((f) => !isPlaceholderOrHidden(f))
		.filter((f) => TEMP_NAME_PATTERNS.some((re) => re.test(f.name)))
		.filter((f) => now - f.stat.mtime >= thresholdMs)
		.filter((f) => !openPaths.has(f.path))
		.map((f) => ({
			type: "temp" as const,
			file: f,
			reason: t(
				`一時・破損ファイル（更新から${formatAge(now - f.stat.mtime)}）`,
				`temp/corrupt file (modified ${formatAge(now - f.stat.mtime)} ago)`,
				`temporäre/beschädigte Datei (geändert vor ${formatAge(now - f.stat.mtime)})`
			),
		}));
}

export interface RunScanOptions {
	includeConflict: boolean;
	includeEmpty: boolean;
	includeTemp: boolean;
	includeNumberedDuplicates: boolean;
}

export function runScan(app: App, settings: CopyGuardSettings, options: RunScanOptions): ScanCandidate[] {
	const effectiveSettings: CopyGuardSettings = {
		...settings,
		includeNumberedDuplicates: options.includeNumberedDuplicates,
	};
	const files = getScopedFiles(app, effectiveSettings);
	const results: ScanCandidate[] = [];
	if (options.includeConflict) results.push(...scanConflicts(effectiveSettings, files));
	if (options.includeEmpty) results.push(...scanEmptyFiles(app, effectiveSettings, files));
	if (options.includeTemp) results.push(...scanTempFiles(app, effectiveSettings, files));
	return results;
}

/** Ensures the trash folder exists and moves the given files into it, avoiding name collisions. */
export async function moveToTrash(
	app: App,
	trashFolderName: string,
	files: TFile[]
): Promise<{ moved: number; failed: TFile[] }> {
	const trashPath = normalizeFolder(trashFolderName);
	const existing = app.vault.getAbstractFileByPath(trashPath);
	if (!existing) {
		await app.vault.createFolder(trashPath);
	}

	let moved = 0;
	const failed: TFile[] = [];

	for (const file of files) {
		let destName = file.name;
		let dest = normalizePath(`${trashPath}/${destName}`);
		let counter = 1;
		while (app.vault.getAbstractFileByPath(dest)) {
			destName = `${file.basename} (${counter}).${file.extension}`;
			dest = normalizePath(`${trashPath}/${destName}`);
			counter++;
		}
		try {
			await app.fileManager.renameFile(file, dest);
			moved++;
		} catch (e) {
			console.error("CopyGuard: failed to move", file.path, e);
			failed.push(file);
		}
	}

	return { moved, failed };
}

function collectFilesRecursive(folder: TFolder, out: TFile[]): void {
	for (const child of folder.children) {
		if (child instanceof TFile) out.push(child);
		else if (child instanceof TFolder) collectFilesRecursive(child, out);
	}
}

export function getTrashFolder(app: App, trashFolderName: string): TFolder | null {
	const abstract = app.vault.getAbstractFileByPath(normalizeFolder(trashFolderName));
	return abstract instanceof TFolder ? abstract : null;
}

export function countTrashFiles(app: App, trashFolderName: string): number {
	const folder = getTrashFolder(app, trashFolderName);
	if (!folder) return 0;
	const files: TFile[] = [];
	collectFilesRecursive(folder, files);
	return files.length;
}

export async function emptyTrashFolder(app: App, trashFolderName: string): Promise<number> {
	const folder = getTrashFolder(app, trashFolderName);
	if (!folder) return 0;
	const files: TFile[] = [];
	collectFilesRecursive(folder, files);
	let deleted = 0;
	for (const file of files) {
		try {
			await app.fileManager.trashFile(file);
			deleted++;
		} catch (e) {
			console.error("CopyGuard: failed to delete", file.path, e);
		}
	}
	return deleted;
}
