import { App, PluginSettingTab, Setting } from "obsidian";
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
	/** true = send to OS trash (recoverable). false = permanently delete. */
	useSystemTrashForFinalDelete: boolean;
}

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
	useSystemTrashForFinalDelete: true,
};

function parseList(value: string): string[] {
	return value
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

export class CopyGuardSettingTab extends PluginSettingTab {
	plugin: CopyGuardPlugin;

	constructor(app: App, plugin: CopyGuardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const settings = this.plugin.settings;

		containerEl.createEl("h2", { text: "CopyGuard" });
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

		containerEl.createEl("h3", { text: t("対象フォルダ", "Folders to scan", "Zu prüfende Ordner") });

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

		containerEl.createEl("h3", { text: t("競合コピー", "Conflict copies", "Konfliktkopien") });

		new Setting(containerEl)
			.setName(t("競合コピーを検出する", "Detect conflict copies", "Konfliktkopien erkennen"))
			.setDesc(
				t(
					"iCloud / Dropbox / Remotely Save / Obsidian Sync / Syncthing の名前の型に合わせます。同じフォルダに元ファイルがある場合だけ対象にします。",
					"Matches name patterns from iCloud / Dropbox / Remotely Save / Obsidian Sync / Syncthing. Only when the original file is in the same folder.",
					"Passt zu Namensmustern von iCloud / Dropbox / Remotely Save / Obsidian Sync / Syncthing. Nur wenn die Originaldatei im selben Ordner liegt."
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

		containerEl.createEl("h3", { text: t("空ファイル（0バイト）", "Empty files (0 bytes)", "Leere Dateien (0 Byte)") });

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

		containerEl.createEl("h3", { text: t("一時・破損ファイル", "Temp / corrupt files", "Temporäre / beschädigte Dateien") });

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

		containerEl.createEl("h3", { text: t("隔離フォルダの最終削除", "Final delete from quarantine", "Endgültiges Löschen aus der Quarantäne") });

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
			.setName(t("OS のゴミ箱へ送る（復元できます）", "Send to the system trash (recoverable)", "In den System-Papierkorb (wiederherstellbar)"))
			.setDesc(
				t(
					"オフにすると、確認後に完全削除します。",
					"If off, files are permanently deleted after you confirm.",
					"Wenn aus, werden Dateien nach der Bestätigung endgültig gelöscht."
				)
			)
			.addToggle((toggle) =>
				toggle.setValue(settings.useSystemTrashForFinalDelete).onChange(async (value) => {
					settings.useSystemTrashForFinalDelete = value;
					await this.plugin.saveSettings();
				})
			);

		const legalWrap = containerEl.createDiv({ cls: "copyguard-legal-settings" });
		appendLegalBody(legalWrap);

		containerEl.createEl("h3", { text: t("応援", "Support", "Unterstützung") });

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
