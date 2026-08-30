import { App, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import type CopyGuardPlugin from "./main";
import { openBuyMeACoffee, openGithubIssues } from "./constants";
import { promptEnableStartupConfirm } from "./enableStartupConfirmModal";
import { t } from "./i18n";
import { appendLegalBody } from "./legal";

export interface CopyGuardSettings {
	trashFolderName: string;
	scanFolders: string[];
	excludeFolders: string[];
	enableConflict: boolean;
	includeNumberedDuplicates: boolean;
	enableEmpty: boolean;
	emptyMinAgeDays: number;
	emptyExtensions: string[];
	enableTemp: boolean;
	tempMinAgeDays: number;
	confirmTrashOnStartup: boolean;
}

export type CopyGuardSettingKey = keyof CopyGuardSettings;

type SettingsTabId = "general" | "scan" | "delete" | "info";

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
	private activeTab: SettingsTabId = "general";

	constructor(app: App, plugin: CopyGuardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem<CopyGuardSettingKey>[] {
		return [
			{
				name: t("settingsOverview"),
				desc: t("settingsOverviewDesc"),
			},
			{
				name: t("githubIssues"),
				desc: t("githubIssuesDesc"),
			},
			{
				name: t("trashFolderName"),
				desc: t("trashFolderDesc"),
				control: {
					type: "text",
					key: "trashFolderName",
					defaultValue: DEFAULT_SETTINGS.trashFolderName,
				},
			},
			{
				type: "group",
				heading: t("scanFoldersHeading"),
				items: [
					{
						name: t("scanFolders"),
						desc: t("scanFoldersDesc"),
						control: { type: "textarea", key: "scanFolders", defaultValue: "" },
					},
					{
						name: t("excludeFolders"),
						desc: t("excludeFoldersDesc"),
						control: { type: "textarea", key: "excludeFolders", defaultValue: "" },
					},
				],
			},
			{
				type: "group",
				heading: t("conflictHeading"),
				items: [
					{
						name: t("enableConflict"),
						desc: t("enableConflictDesc"),
						control: { type: "toggle", key: "enableConflict", defaultValue: DEFAULT_SETTINGS.enableConflict },
					},
					{
						name: t("includeNumberedDuplicates"),
						desc: t("includeNumberedDuplicatesDesc"),
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
				heading: t("emptyHeading"),
				items: [
					{
						name: t("enableEmpty"),
						desc: t("enableEmptyDesc"),
						control: { type: "toggle", key: "enableEmpty", defaultValue: DEFAULT_SETTINGS.enableEmpty },
					},
					{
						name: t("emptyMinAgeDays"),
						desc: t("emptyMinAgeDaysDesc"),
						control: { type: "number", key: "emptyMinAgeDays", min: 0, defaultValue: DEFAULT_SETTINGS.emptyMinAgeDays },
					},
					{
						name: t("emptyExtensions"),
						desc: t("emptyExtensionsDesc"),
						control: { type: "text", key: "emptyExtensions", defaultValue: DEFAULT_SETTINGS.emptyExtensions.join(", ") },
					},
				],
			},
			{
				type: "group",
				heading: t("tempHeading"),
				items: [
					{
						name: t("enableTemp"),
						desc: t("enableTempDesc"),
						control: { type: "toggle", key: "enableTemp", defaultValue: DEFAULT_SETTINGS.enableTemp },
					},
					{
						name: t("tempMinAgeDays"),
						control: { type: "number", key: "tempMinAgeDays", min: 0, defaultValue: DEFAULT_SETTINGS.tempMinAgeDays },
					},
				],
			},
			{
				type: "group",
				heading: t("deleteHeading"),
				items: [
					{
						name: t("confirmTrashOnStartup"),
						desc: t("confirmTrashOnStartupDesc"),
						control: {
							type: "toggle",
							key: "confirmTrashOnStartup",
							defaultValue: DEFAULT_SETTINGS.confirmTrashOnStartup,
						},
					},
					{
						name: t("deleteDestination"),
						desc: t("deleteDestinationDesc"),
					},
				],
			},
			{
				name: t("legalPrivacy"),
				render: (setting) => {
					appendLegalBody(setting.settingEl);
				},
			},
			{
				type: "group",
				heading: t("supportHeading"),
				items: [
					{
						name: "Buy Me a Coffee",
						desc: t("supportOptional"),
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
		if (key === "confirmTrashOnStartup") {
			const next = Boolean(value);
			const ok = await this.applyConfirmTrashOnStartup(next);
			if (!ok) return;
			await this.plugin.saveSettings();
			return;
		}
		await this.applySetting(key, value);
		await this.plugin.saveSettings();
	}

	private async applyConfirmTrashOnStartup(next: boolean): Promise<boolean> {
		const settings = this.plugin.settings;
		if (next && !settings.confirmTrashOnStartup) {
			const confirmed = await promptEnableStartupConfirm(this.app);
			if (!confirmed) return false;
		}
		settings.confirmTrashOnStartup = next;
		return true;
	}

	private async applySetting(key: string, value: unknown): Promise<void> {
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
		}
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("copyguard-settings");

		this.renderTabNav(containerEl);
		const panel = containerEl.createDiv({ cls: "copyguard-settings-panel" });
		this.renderActiveTab(panel);
	}

	hide(): void {
		this.containerEl.empty();
	}

	private renderTabNav(containerEl: HTMLElement): void {
		const nav = containerEl.createDiv({ cls: "copyguard-settings-nav" });
		const tabs: { id: SettingsTabId; label: string }[] = [
			{ id: "general", label: t("tabGeneral") },
			{ id: "scan", label: t("tabScan") },
			{ id: "delete", label: t("tabDelete") },
			{ id: "info", label: t("tabInfo") },
		];

		for (const tab of tabs) {
			const btn = nav.createEl("button", {
				cls: "copyguard-settings-tab",
				text: tab.label,
				type: "button",
			});
			if (tab.id === this.activeTab) btn.addClass("is-active");
			btn.addEventListener("click", () => {
				this.activeTab = tab.id;
				this.display();
			});
		}
	}

	private renderActiveTab(panel: HTMLElement): void {
		switch (this.activeTab) {
			case "general":
				this.renderGeneralTab(panel);
				break;
			case "scan":
				this.renderScanTab(panel);
				break;
			case "delete":
				this.renderDeleteTab(panel);
				break;
			case "info":
				this.renderInfoTab(panel);
				break;
		}
	}

	private renderGithubIssuesBanner(containerEl: HTMLElement): void {
		const banner = containerEl.createDiv({ cls: "copyguard-issues-banner" });
		banner.createEl("p", { text: t("githubIssuesBanner"), cls: "copyguard-issues-banner-text" });
		new Setting(banner).addButton((btn) =>
			btn.setButtonText(t("openGithubIssues")).onClick(() => openGithubIssues())
		);
	}

	private renderGeneralTab(containerEl: HTMLElement): void {
		this.renderGithubIssuesBanner(containerEl);

		containerEl.createEl("p", {
			text: t("settingsOverviewDesc"),
			cls: "setting-item-description",
		});

		const settings = this.plugin.settings;
		new Setting(containerEl)
			.setName(t("trashFolderName"))
			.setDesc(t("trashFolderDesc"))
			.addText((text) =>
				text
					.setPlaceholder("K-Tech Trash Box")
					.setValue(settings.trashFolderName)
					.onChange(async (value) => {
						await this.applySetting("trashFolderName", value);
						await this.plugin.saveSettings();
					})
			);
	}

	private renderScanTab(containerEl: HTMLElement): void {
		const settings = this.plugin.settings;

		new Setting(containerEl).setName(t("scanFoldersHeading")).setHeading();

		new Setting(containerEl)
			.setName(t("scanFolders"))
			.setDesc(t("scanFoldersDesc"))
			.addTextArea((textArea) =>
				textArea
					.setPlaceholder("10 Drafts, 20 Published")
					.setValue(settings.scanFolders.join(", "))
					.onChange(async (value) => {
						await this.applySetting("scanFolders", value);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t("excludeFolders"))
			.setDesc(t("excludeFoldersDesc"))
			.addTextArea((textArea) =>
				textArea
					.setPlaceholder(".trash, templates")
					.setValue(settings.excludeFolders.join(", "))
					.onChange(async (value) => {
						await this.applySetting("excludeFolders", value);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName(t("conflictHeading")).setHeading();

		new Setting(containerEl)
			.setName(t("enableConflict"))
			.setDesc(t("enableConflictDesc"))
			.addToggle((toggle) =>
				toggle.setValue(settings.enableConflict).onChange(async (value) => {
					await this.applySetting("enableConflict", value);
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("includeNumberedDuplicates"))
			.setDesc(t("includeNumberedDuplicatesDesc"))
			.addToggle((toggle) =>
				toggle.setValue(settings.includeNumberedDuplicates).onChange(async (value) => {
					await this.applySetting("includeNumberedDuplicates", value);
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl).setName(t("emptyHeading")).setHeading();

		new Setting(containerEl)
			.setName(t("enableEmpty"))
			.setDesc(t("enableEmptyDesc"))
			.addToggle((toggle) =>
				toggle.setValue(settings.enableEmpty).onChange(async (value) => {
					await this.applySetting("enableEmpty", value);
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("emptyMinAgeDays"))
			.setDesc(t("emptyMinAgeDaysDesc"))
			.addText((text) =>
				text.setValue(String(settings.emptyMinAgeDays)).onChange(async (value) => {
					await this.applySetting("emptyMinAgeDays", value);
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("emptyExtensions"))
			.setDesc(t("emptyExtensionsDesc"))
			.addText((text) =>
				text.setValue(settings.emptyExtensions.join(", ")).onChange(async (value) => {
					await this.applySetting("emptyExtensions", value);
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl).setName(t("tempHeading")).setHeading();

		new Setting(containerEl)
			.setName(t("enableTemp"))
			.setDesc(t("enableTempDesc"))
			.addToggle((toggle) =>
				toggle.setValue(settings.enableTemp).onChange(async (value) => {
					await this.applySetting("enableTemp", value);
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("tempMinAgeDays"))
			.addText((text) =>
				text.setValue(String(settings.tempMinAgeDays)).onChange(async (value) => {
					await this.applySetting("tempMinAgeDays", value);
					await this.plugin.saveSettings();
				})
			);
	}

	private renderDeleteTab(containerEl: HTMLElement): void {
		const settings = this.plugin.settings;

		new Setting(containerEl).setName(t("deleteHeading")).setHeading();

		new Setting(containerEl)
			.setName(t("confirmTrashOnStartup"))
			.setDesc(t("confirmTrashOnStartupDesc"))
			.addToggle((toggle) =>
				toggle.setValue(settings.confirmTrashOnStartup).onChange(async (value) => {
					const ok = await this.applyConfirmTrashOnStartup(value);
					if (!ok) {
						toggle.setValue(settings.confirmTrashOnStartup);
						return;
					}
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName(t("deleteDestination"))
			.setDesc(t("deleteDestinationDesc"));
	}

	private renderInfoTab(containerEl: HTMLElement): void {
		this.renderGithubIssuesBanner(containerEl);

		new Setting(containerEl)
			.setName(t("githubIssues"))
			.setDesc(t("githubIssuesDesc"))
			.addButton((btn) => btn.setButtonText(t("openGithubIssues")).onClick(() => openGithubIssues()));

		const legalWrap = containerEl.createDiv({ cls: "copyguard-legal-settings" });
		new Setting(legalWrap).setName(t("legalPrivacy")).setHeading();
		appendLegalBody(legalWrap);

		new Setting(containerEl).setName(t("supportHeading")).setHeading();

		new Setting(containerEl)
			.setName("Buy Me a Coffee")
			.setDesc(t("supportOptional"))
			.addButton((button) => {
				button.setButtonText("☕ Buy Me a Coffee");
				button.buttonEl.addClass("copyguard-bmc-btn");
				button.onClick(() => openBuyMeACoffee());
			});
	}
}
