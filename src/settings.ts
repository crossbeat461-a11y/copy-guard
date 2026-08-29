import { App, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import type CopyGuardPlugin from "./main";
import { openBuyMeACoffee } from "./constants";
import { t } from "./i18n";
import { appendLegalBody } from "./legal";

export interface CopyGuardSettings {
	/** Vault-relative path of the dedicated quarantine folder. */
	trashFolderName: string;

	/** Only scan these folders (vault-relative). Empty = whole vault. */
	scanFolders: string[];

	/** Never scan these folders, in addition to trashFolderName. */
	excludeFolders: string[];

	enableConflict: boolean;
	/** Also treat "name 2.md" / "name (1).md" as conflict copies. Riskier. */
	includeNumberedDuplicates: boolean;

	enableEmpty: boolean;
	emptyMinAgeDays: number;
	emptyExtensions: string[];

	enableTemp: boolean;
	tempMinAgeDays: number;

	/** Ask on startup whether to permanently clear the trash folder. */
	confirmTrashOnStartup: boolean;
}

export type CopyGuardSettingKey = keyof CopyGuardSettings;

export const DEFAULT_SETTINGS: CopyGuardSettings = {
	trashFolderName: "K-Tech Trash Box",
	scanFolders: [],
	excludeFolders: [],
	enableConflict: true,
	includeNumberedDuplicates: false,
	enableEmpty: true,
	emptyMinAgeDays: 7,
	emptyExtensions: ["md"],
	enableTemp: true,
	tempMinAgeDays: 7,
	confirmTrashOnStartup: true,
};

function parseList(value: string): string[] {
	return value
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

function parseExtensions(value: string): string[] {
	const list = parseList(value).map((s) => s.replace(/^\./, "").toLowerCase());
	return list.length > 0 ? list : DEFAULT_SETTINGS.emptyExtensions;
}

function parseDays(value: unknown, fallback: number): number {
	const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
	return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function parseSavedSettings(data: unknown): Partial<CopyGuardSettings> {
	if (data === null || typeof data !== "object") return {};
	const rec = data as Record<string, unknown>;
	const out: Partial<CopyGuardSettings> = {};
	if (typeof rec.trashFolderName === "string") out.trashFolderName = rec.trashFolderName;
	if (Array.isArray(rec.scanFolders)) {
		out.scanFolders = rec.scanFolders.filter((x): x is string => typeof x === "string");
	}
	if (Array.isArray(rec.excludeFolders)) {
		out.excludeFolders = rec.excludeFolders.filter((x): x is string => typeof x === "string");
	}
	if (typeof rec.enableConflict === "boolean") out.enableConflict = rec.enableConflict;
	if (typeof rec.includeNumberedDuplicates === "boolean") {
		out.includeNumberedDuplicates = rec.includeNumberedDuplicates;
	}
	if (typeof rec.enableEmpty === "boolean") out.enableEmpty = rec.enableEmpty;
	if (typeof rec.emptyMinAgeDays === "number") out.emptyMinAgeDays = parseDays(rec.emptyMinAgeDays, DEFAULT_SETTINGS.emptyMinAgeDays);
	if (Array.isArray(rec.emptyExtensions)) {
		out.emptyExtensions = rec.emptyExtensions.filter((x): x is string => typeof x === "string");
	}
	if (typeof rec.enableTemp === "boolean") out.enableTemp = rec.enableTemp;
	if (typeof rec.tempMinAgeDays === "number") out.tempMinAgeDays = parseDays(rec.tempMinAgeDays, DEFAULT_SETTINGS.tempMinAgeDays);
	if (typeof rec.confirmTrashOnStartup === "boolean") out.confirmTrashOnStartup = rec.confirmTrashOnStartup;
	return out;
}

export class CopyGuardSettingTab extends PluginSettingTab {
	plugin: CopyGuardPlugin;

	constructor(app: App, plugin: CopyGuardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem<CopyGuardSettingKey>[] {
		return [
			{
				name: t("概要", "How it works", "Hinweis"),
				desc: t(
					"検出は名前と大きさだけで判定します。削除は2段階です。まずここで移動先の箱を決めてください。",
					"Detection uses names and size only. Deletion is two steps. Set the quarantine folder here first.",
					"Die Erkennung nutzt nur Namen und Größe. Das Löschen erfolgt in zwei Schritten. Legen Sie hier zuerst den Quarantäneordner fest."
				),
			},
			{
				name: t("隔離フォルダ（Trash Box）", "Quarantine folder (Trash Box)", "Quarantäneordner (Trash Box)"),
				desc: t(
					"競合コピー・空ファイル・一時ファイルの移動先。Vault 直下からの相対パス。",
					"Where approved conflict copies, empty files, and temp files are moved. Path from the vault root.",
					"Ziel für Konfliktkopien, leere Dateien und temporäre Dateien. Relativer Pfad ab Vault-Wurzel."
				),
				control: {
					type: "text",
					key: "trashFolderName",
					defaultValue: DEFAULT_SETTINGS.trashFolderName,
				},
			},
			{
				type: "group",
				heading: t("対象フォルダ", "Folders to scan", "Zu prüfende Ordner"),
				items: [
					{
						name: t("スキャン対象フォルダ", "Scan folders", "Scan-Ordner"),
						desc: t(
							"カンマ区切り。空欄なら Vault 全体を対象にします。",
							"Comma-separated. Leave empty to scan the whole vault.",
							"Kommagetrennt. Leer lassen, um den ganzen Vault zu prüfen."
						),
						control: {
							type: "textarea",
							key: "scanFolders",
							defaultValue: "",
						},
					},
					{
						name: t("除外フォルダ", "Excluded folders", "Ausgeschlossene Ordner"),
						desc: t(
							"カンマ区切り。隔離フォルダ自体は常に除外します。",
							"Comma-separated. The quarantine folder is always excluded.",
							"Kommagetrennt. Der Quarantäneordner ist immer ausgeschlossen."
						),
						control: {
							type: "textarea",
							key: "excludeFolders",
							defaultValue: "",
						},
					},
				],
			},
			{
				type: "group",
				heading: t("競合コピー", "Conflict copies", "Konfliktkopien"),
				items: [
					{
						name: t("競合コピーを検出する", "Detect conflict copies", "Konfliktkopien erkennen"),
						desc: t(
							"iCloud / Dropbox / Remotely Save / Sync / Syncthing の名前の型に合わせます。同じフォルダに元ファイルがある場合だけ対象にします。",
							"Matches name patterns from iCloud / Dropbox / Remotely Save / Sync / Syncthing. Only when the original file is in the same folder.",
							"Passt zu Namensmustern von iCloud / Dropbox / Remotely Save / Sync / Syncthing. Nur wenn die Originaldatei im selben Ordner liegt."
						),
						control: {
							type: "toggle",
							key: "enableConflict",
							defaultValue: DEFAULT_SETTINGS.enableConflict,
						},
					},
					{
						name: t("番号付きの重複も含める", "Include numbered duplicates", "Nummerierte Duplikate einbeziehen"),
						desc: t(
							"「◯◯ 2.md」「◯◯(1).md」のような番号違いも対象にします。本人が付けた題と区別できないため、既定はオフです。",
							"Also treats names like “Note 2.md” or “Note(1).md” as copies. Easy to confuse with a title you chose, so this is off by default.",
							"Behandelt auch Namen wie „Notiz 2.md“ oder „Notiz(1).md“. Das ist leicht mit einem selbst gewählten Titel zu verwechseln, daher standardmäßig aus."
						),
						control: {
							type: "toggle",
							key: "includeNumberedDuplicates",
							defaultValue: DEFAULT_SETTINGS.includeNumberedDuplicates,
						},
					},
				],
			},
			{
				type: "group",
				heading: t("空ファイル（0バイト）", "Empty files (0 bytes)", "Leere Dateien (0 Byte)"),
				items: [
					{
						name: t("空ファイルを検出する", "Detect empty files", "Leere Dateien erkennen"),
						desc: t(
							"開いているファイルは対象から外します。",
							"Files that are open are skipped.",
							"Geöffnete Dateien werden übersprungen."
						),
						control: {
							type: "toggle",
							key: "enableEmpty",
							defaultValue: DEFAULT_SETTINGS.enableEmpty,
						},
					},
					{
						name: t("何日より前の更新を対象にするか", "Only if last modified this many days ago", "Nur wenn vor so vielen Tagen geändert"),
						desc: t(
							"この日数より新しい空ファイルは、作りかけとみなして対象外にします。",
							"Newer empty files are treated as drafts in progress and skipped.",
							"Neuere leere Dateien gelten als Entwürfe und werden übersprungen."
						),
						control: {
							type: "number",
							key: "emptyMinAgeDays",
							min: 0,
							defaultValue: DEFAULT_SETTINGS.emptyMinAgeDays,
						},
					},
					{
						name: t("対象の拡張子", "Extensions", "Dateiendungen"),
						desc: t(
							"カンマ区切り。既定は Markdown だけです。",
							"Comma-separated. Markdown only by default.",
							"Kommagetrennt. Standard ist nur Markdown."
						),
						control: {
							type: "text",
							key: "emptyExtensions",
							defaultValue: DEFAULT_SETTINGS.emptyExtensions.join(", "),
						},
					},
				],
			},
			{
				type: "group",
				heading: t("一時・破損ファイル", "Temp / corrupt files", "Temporäre / beschädigte Dateien"),
				items: [
					{
						name: t("一時・破損ファイルを検出する", "Detect temp / corrupt files", "Temporäre / beschädigte Dateien erkennen"),
						desc: t(
							".tmp / 末尾が ~ / Office のロックファイルなど。.icloud のプレースホルダは対象外です。",
							".tmp, names ending in ~, Office lock files, and similar. .icloud placeholders are skipped.",
							".tmp, Namen mit ~ am Ende, Office-Sperrdateien u. a. .icloud-Platzhalter werden übersprungen."
						),
						control: {
							type: "toggle",
							key: "enableTemp",
							defaultValue: DEFAULT_SETTINGS.enableTemp,
						},
					},
					{
						name: t("何日より前の更新を対象にするか", "Only if last modified this many days ago", "Nur wenn vor so vielen Tagen geändert"),
						control: {
							type: "number",
							key: "tempMinAgeDays",
							min: 0,
							defaultValue: DEFAULT_SETTINGS.tempMinAgeDays,
						},
					},
				],
			},
			{
				type: "group",
				heading: t("隔離フォルダの最終削除", "Final delete from quarantine", "Endgültiges Löschen aus der Quarantäne"),
				items: [
					{
						name: t("起動時に確認する", "Ask on startup", "Beim Start nachfragen"),
						desc: t(
							"隔離フォルダに中身があるときだけ、削除してよいか尋ねます。既定は「消さない」です。",
							"Only if the quarantine folder has files, ask whether to delete them. The default answer is not to delete.",
							"Nur wenn der Quarantäneordner Dateien enthält, wird nach dem Löschen gefragt. Standard ist: nicht löschen."
						),
						control: {
							type: "toggle",
							key: "confirmTrashOnStartup",
							defaultValue: DEFAULT_SETTINGS.confirmTrashOnStartup,
						},
					},
					{
						name: t("削除先", "Where deleted files go", "Wohin gelöschte Dateien kommen"),
						desc: t(
							"アプリの「削除したファイル」の設定に従います（システムゴミ箱 / .trash / 完全削除）。",
							"Follows the app’s Deleted files setting (system trash, .trash, or permanent).",
							"Folgt der App-Einstellung für gelöschte Dateien (System-Papierkorb, .trash oder endgültig)."
						),
					},
				],
			},
			{
				name: t("免責とプライバシー", "Disclaimer and privacy", "Haftung und Datenschutz"),
				render: (setting) => {
					appendLegalBody(setting.settingEl);
				},
			},
			{
				type: "group",
				heading: t("応援", "Support", "Unterstützung"),
				items: [
					{
						name: "Buy Me a Coffee",
						desc: t("開発の応援は任意です。", "Support is optional.", "Unterstützung ist freiwillig."),
						action: () => openBuyMeACoffee(),
					},
				],
			},
		];
	}

	getControlValue(key: string): unknown {
		const settings = this.plugin.settings;
		if (key === "scanFolders" || key === "excludeFolders" || key === "emptyExtensions") {
			return settings[key].join(", ");
		}
		return settings[key as CopyGuardSettingKey];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const settings = this.plugin.settings;
		if (key === "trashFolderName") {
			settings.trashFolderName = String(value).trim() || DEFAULT_SETTINGS.trashFolderName;
		} else if (key === "scanFolders") {
			settings.scanFolders = parseList(String(value));
		} else if (key === "excludeFolders") {
			settings.excludeFolders = parseList(String(value));
		} else if (key === "enableConflict") {
			settings.enableConflict = Boolean(value);
		} else if (key === "includeNumberedDuplicates") {
			settings.includeNumberedDuplicates = Boolean(value);
		} else if (key === "enableEmpty") {
			settings.enableEmpty = Boolean(value);
		} else if (key === "emptyMinAgeDays") {
			settings.emptyMinAgeDays = parseDays(value, DEFAULT_SETTINGS.emptyMinAgeDays);
		} else if (key === "emptyExtensions") {
			settings.emptyExtensions = parseExtensions(String(value));
		} else if (key === "enableTemp") {
			settings.enableTemp = Boolean(value);
		} else if (key === "tempMinAgeDays") {
			settings.tempMinAgeDays = parseDays(value, DEFAULT_SETTINGS.tempMinAgeDays);
		} else if (key === "confirmTrashOnStartup") {
			settings.confirmTrashOnStartup = Boolean(value);
		}
		await this.plugin.saveSettings();
	}

	/** Fallback for app versions older than 1.13.0. */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const settings = this.plugin.settings;

		containerEl.createEl("p", {
			text: t(
				"検出は名前と大きさだけで判定します。削除は2段階です。まずここで移動先の箱を決めてください。",
				"Detection uses names and size only. Deletion is two steps. Set the quarantine folder here first.",
				"Die Erkennung nutzt nur Namen und Größe. Das Löschen erfolgt in zwei Schritten. Legen Sie hier zuerst den Quarantäneordner fest."
			),
			cls: "setting-item-description",
		});

		new Setting(containerEl)
			.setName(t("隔離フォルダ（Trash Box）", "Quarantine folder (Trash Box)", "Quarantäneordner (Trash Box)"))
			.setDesc(
				t(
					"競合コピー・空ファイル・一時ファイルの移動先。Vault 直下からの相対パス。",
					"Where approved conflict copies, empty files, and temp files are moved. Path from the vault root.",
					"Ziel für Konfliktkopien, leere Dateien und temporäre Dateien. Relativer Pfad ab Vault-Wurzel."
				)
			)
			.addText((text) =>
				text
					.setPlaceholder("K-Tech Trash Box")
					.setValue(settings.trashFolderName)
					.onChange(async (value) => {
						settings.trashFolderName = value.trim() || DEFAULT_SETTINGS.trashFolderName;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName(t("対象フォルダ", "Folders to scan", "Zu prüfende Ordner")).setHeading();

		new Setting(containerEl)
			.setName(t("スキャン対象フォルダ", "Scan folders", "Scan-Ordner"))
			.setDesc(
				t(
					"カンマ区切り。空欄なら Vault 全体を対象にします。",
					"Comma-separated. Leave empty to scan the whole vault.",
					"Kommagetrennt. Leer lassen, um den ganzen Vault zu prüfen."
				)
			)
			.addTextArea((textArea) =>
				textArea
					.setPlaceholder("10 Drafts, 20 Published")
					.setValue(settings.scanFolders.join(", "))
					.onChange(async (value) => {
						settings.scanFolders = parseList(value);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t("除外フォルダ", "Excluded folders", "Ausgeschlossene Ordner"))
			.setDesc(
				t(
					"カンマ区切り。隔離フォルダ自体は常に除外します。",
					"Comma-separated. The quarantine folder is always excluded.",
					"Kommagetrennt. Der Quarantäneordner ist immer ausgeschlossen."
				)
			)
			.addTextArea((textArea) =>
				textArea
					.setPlaceholder(".trash, templates")
					.setValue(settings.excludeFolders.join(", "))
					.onChange(async (value) => {
						settings.excludeFolders = parseList(value);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName(t("競合コピー", "Conflict copies", "Konfliktkopien")).setHeading();

		new Setting(containerEl)
			.setName(t("競合コピーを検出する", "Detect conflict copies", "Konfliktkopien erkennen"))
			.setDesc(
				t(
					"iCloud / Dropbox / Remotely Save / Sync / Syncthing の名前の型に合わせます。同じフォルダに元ファイルがある場合だけ対象にします。",
					"Matches name patterns from iCloud / Dropbox / Remotely Save / Sync / Syncthing. Only when the original file is in the same folder.",
					"Passt zu Namensmustern von iCloud / Dropbox / Remotely Save / Sync / Syncthing. Nur wenn die Originaldatei im selben Ordner liegt."
				)
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.enableConflict).onChange(async (value) => {
					settings.enableConflict = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("番号付きの重複も含める", "Include numbered duplicates", "Nummerierte Duplikate einbeziehen"))
			.setDesc(
				t(
					"「◯◯ 2.md」「◯◯(1).md」のような番号違いも対象にします。本人が付けた題と区別できないため、既定はオフです。",
					"Also treats names like “Note 2.md” or “Note(1).md” as copies. Easy to confuse with a title you chose, so this is off by default.",
					"Behandelt auch Namen wie „Notiz 2.md“ oder „Notiz(1).md“. Das ist leicht mit einem selbst gewählten Titel zu verwechseln, daher standardmäßig aus."
				)
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.includeNumberedDuplicates).onChange(async (value) => {
					settings.includeNumberedDuplicates = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("空ファイル（0バイト）", "Empty files (0 bytes)", "Leere Dateien (0 Byte)"))
			.setHeading();

		new Setting(containerEl)
			.setName(t("空ファイルを検出する", "Detect empty files", "Leere Dateien erkennen"))
			.setDesc(t("開いているファイルは対象から外します。", "Files that are open are skipped.", "Geöffnete Dateien werden übersprungen."))
			.addToggle((toggle) =>
				toggle.setValue(settings.enableEmpty).onChange(async (value) => {
					settings.enableEmpty = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("何日より前の更新を対象にするか", "Only if last modified this many days ago", "Nur wenn vor so vielen Tagen geändert"))
			.setDesc(
				t(
					"この日数より新しい空ファイルは、作りかけとみなして対象外にします。",
					"Newer empty files are treated as drafts in progress and skipped.",
					"Neuere leere Dateien gelten als Entwürfe und werden übersprungen."
				)
			)
			.addText((text) =>
				text.setValue(String(settings.emptyMinAgeDays)).onChange(async (value) => {
					const n = Number.parseInt(value, 10);
					settings.emptyMinAgeDays = Number.isFinite(n) && n >= 0 ? n : DEFAULT_SETTINGS.emptyMinAgeDays;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("対象の拡張子", "Extensions", "Dateiendungen"))
			.setDesc(
				t(
					"カンマ区切り。既定は Markdown だけです。",
					"Comma-separated. Markdown only by default.",
					"Kommagetrennt. Standard ist nur Markdown."
				)
			)
			.addText((text) =>
				text.setValue(settings.emptyExtensions.join(", ")).onChange(async (value) => {
					const list = parseList(value).map((s) => s.replace(/^\./, "").toLowerCase());
					settings.emptyExtensions = list.length > 0 ? list : DEFAULT_SETTINGS.emptyExtensions;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("一時・破損ファイル", "Temp / corrupt files", "Temporäre / beschädigte Dateien"))
			.setHeading();

		new Setting(containerEl)
			.setName(t("一時・破損ファイルを検出する", "Detect temp / corrupt files", "Temporäre / beschädigte Dateien erkennen"))
			.setDesc(
				t(
					".tmp / 末尾が ~ / Office のロックファイルなど。.icloud のプレースホルダは対象外です。",
					".tmp, names ending in ~, Office lock files, and similar. .icloud placeholders are skipped.",
					".tmp, Namen mit ~ am Ende, Office-Sperrdateien u. a. .icloud-Platzhalter werden übersprungen."
				)
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.enableTemp).onChange(async (value) => {
					settings.enableTemp = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("何日より前の更新を対象にするか", "Only if last modified this many days ago", "Nur wenn vor so vielen Tagen geändert"))
			.addText((text) =>
				text.setValue(String(settings.tempMinAgeDays)).onChange(async (value) => {
					const n = Number.parseInt(value, 10);
					settings.tempMinAgeDays = Number.isFinite(n) && n >= 0 ? n : DEFAULT_SETTINGS.tempMinAgeDays;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("隔離フォルダの最終削除", "Final delete from quarantine", "Endgültiges Löschen aus der Quarantäne"))
			.setHeading();

		new Setting(containerEl)
			.setName(t("起動時に確認する", "Ask on startup", "Beim Start nachfragen"))
			.setDesc(
				t(
					"隔離フォルダに中身があるときだけ、削除してよいか尋ねます。既定は「消さない」です。",
					"Only if the quarantine folder has files, ask whether to delete them. The default answer is not to delete.",
					"Nur wenn der Quarantäneordner Dateien enthält, wird nach dem Löschen gefragt. Standard ist: nicht löschen."
				)
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.confirmTrashOnStartup).onChange(async (value) => {
					settings.confirmTrashOnStartup = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("削除先", "Where deleted files go", "Wohin gelöschte Dateien kommen"))
			.setDesc(
				t(
					"アプリの「削除したファイル」の設定に従います（システムゴミ箱 / .trash / 完全削除）。",
					"Follows the app’s Deleted files setting (system trash, .trash, or permanent).",
					"Folgt der App-Einstellung für gelöschte Dateien (System-Papierkorb, .trash oder endgültig)."
				)
			);

		const legalWrap = containerEl.createDiv({ cls: "copyguard-legal-settings" });
		appendLegalBody(legalWrap);

		new Setting(containerEl).setName(t("応援", "Support", "Unterstützung")).setHeading();

		new Setting(containerEl)
			.setName("Buy Me a Coffee")
			.setDesc(
				t("開発の応援は任意です。", "Support is optional.", "Unterstützung ist freiwillig.")
			)
			.addButton((button) => {
				button.setButtonText("☕ Buy Me a Coffee");
				button.buttonEl.addClass("copyguard-bmc-btn");
				button.onClick(() => openBuyMeACoffee());
			});
	}

	hide(): void {
		this.containerEl.empty();
	}
}
