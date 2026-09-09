import { App, normalizePath, TFile, TFolder } from "obsidian";
import {
	stripOfficialSyncHyphenConflict,
	stripProtonDriveSuffixes,
} from "./conflict-names";
import { formatAge, t } from "./i18n";
import type { CopyGuardSettings } from "./settings";

export type CandidateType = "conflict" | "empty" | "temp";

export interface ScanCandidate {
	type: CandidateType;
	file: TFile;
	reason: string;
	/** For conflicts, the vault-relative path of the original file it was matched against. */
	pairPath?: string;
	/** True when pairPath exists and both files have the same bytes. */
	sameContent?: boolean;
}

interface ConflictPattern {
	id: string;
	risky: boolean;
	label: () => string;
	/** Returns the stripped base name (without extension) if the basename matches, else null. */
	strip: (basename: string) => string | null;
}

/** `Note (…keyword…)` / `Note（…keyword…）` — account name may come before the keyword. */
function stripParenKeyword(basename: string, keyword: RegExp): string | null {
	const m = basename.match(/^(.*?)[（(]([^）)]*)[）)]\s*$/);
	if (!m || m[1].trim().length === 0) return null;
	if (!keyword.test(m[2])) return null;
	return m[1].trim();
}

const CONFLICT_PATTERNS: ConflictPattern[] = [
	{
		id: "proton-drive",
		risky: false,
		label: () => t("protonDriveConflict"),
		strip: stripProtonDriveSuffixes,
	},
	{
		id: "official-sync-hyphen",
		risky: false,
		label: () => t("officialSyncConflict"),
		strip: stripOfficialSyncHyphenConflict,
	},
	{
		id: "conflicted-copy-en",
		risky: false,
		label: () => t("conflictedCopyEn"),
		// Dropbox / Nextcloud EN: `Note (Alice's conflicted copy 2026-08-31)`
		strip: (basename) => stripParenKeyword(basename, /conflicted copy/i),
	},
	{
		id: "conflicted-copy-ja",
		risky: false,
		label: () => t("conflictCopyJa"),
		// Dropbox JA: `Note (Alice の競合コピー 2026-08-31)`
		strip: (basename) => stripParenKeyword(basename, /競合コピー/),
	},
	{
		id: "conflicted-copy-de",
		risky: false,
		label: () => t("conflictCopyDe"),
		strip: (basename) =>
			stripParenKeyword(basename, /konfliktkopie|in konflikt stehende kopie/i),
	},
	{
		id: "conflicted-copy-ko",
		risky: false,
		label: () => t("conflictCopyKo"),
		strip: (basename) => stripParenKeyword(basename, /충돌하는 사본|충돌하는 복사본|충돌 복사본/),
	},
	{
		id: "conflicted-copy-zh",
		risky: false,
		label: () => t("conflictCopyZh"),
		strip: (basename) => stripParenKeyword(basename, /冲突的副本|衝突的複本/),
	},
	{
		id: "conflicted-copy-es",
		risky: false,
		label: () => t("conflictCopyEs"),
		strip: (basename) => stripParenKeyword(basename, /copia en conflicto/i),
	},
	{
		id: "conflicted-copy-pt",
		risky: false,
		label: () => t("conflictCopyPt"),
		strip: (basename) => stripParenKeyword(basename, /c[oó]pia em conflito/i),
	},
	{
		id: "official-sync-conflict",
		risky: false,
		label: () => t("officialSyncConflict"),
		// Official Sync leftover: `Note (conflict 2026-08-31 1234)`
		strip: (basename) => {
			const m = basename.match(
				/^(.*?)\s*[（(]\s*conflict\s+\d{4}[-./]\d{1,2}[-./]\d{1,2}[^）)]*[）)]\s*$/i
			);
			return m && m[1].trim().length > 0 ? m[1].trim() : null;
		},
	},
	{
		id: "nextcloud-conflict",
		risky: false,
		label: () => t("nextcloudConflict"),
		strip: (basename) => {
			const m = basename.match(/^(.*?)_conflict-\d{8}(?:-\d{6})?$/);
			return m && m[1].trim().length > 0 ? m[1].trim() : null;
		},
	},
	{
		id: "sync-conflict",
		risky: false,
		label: () => t("syncConflict"),
		strip: (basename) => {
			const m = basename.match(/^(.*?)\.sync-conflict-\d{8}-\d{6}-[a-z0-9]+$/i);
			return m && m[1].trim().length > 0 ? m[1].trim() : null;
		},
	},
	{
		id: "numbered-duplicate",
		risky: true,
		label: () => t("numberedDuplicate"),
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
					reason: `${pattern.label()} → ${t("original")}: ${pair.name}`,
					pairPath: pair.path,
				});
				break;
			}
			if (!pattern.risky) {
				candidates.push({
					type: "conflict",
					file: f,
					reason: `${pattern.label()} → ${t("noOriginal")}`,
				});
				break;
			}
		}
	}
	return candidates;
}

function buffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
	if (a.byteLength !== b.byteLength) return false;
	const va = new Uint8Array(a);
	const vb = new Uint8Array(b);
	for (let i = 0; i < va.length; i++) {
		if (va[i] !== vb[i]) return false;
	}
	return true;
}

/** When a conflict has an original in the same folder, mark whether the bytes match. */
export async function annotateSameContent(app: App, candidates: ScanCandidate[]): Promise<void> {
	for (const candidate of candidates) {
		if (candidate.type !== "conflict" || !candidate.pairPath) continue;
		const pair = app.vault.getAbstractFileByPath(candidate.pairPath);
		if (!(pair instanceof TFile)) continue;
		if (candidate.file.stat.size !== pair.stat.size) {
			candidate.sameContent = false;
			continue;
		}
		try {
			const left = await app.vault.readBinary(candidate.file);
			const right = await app.vault.readBinary(pair);
			candidate.sameContent = buffersEqual(left, right);
		} catch {
			/* leave sameContent unset when a file cannot be read */
		}
	}
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
			reason: t("emptyFileReason", { age: formatAge(now - f.stat.mtime) }),
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
			reason: t("tempFileReason", { age: formatAge(now - f.stat.mtime) }),
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
		} catch {
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
		} catch {
			/* skip files the app cannot trash */
		}
	}
	return deleted;
}
