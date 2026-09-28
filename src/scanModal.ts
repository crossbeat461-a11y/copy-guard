import { App, Modal, Notice, Setting } from "obsidian";
import type CopyGuardPlugin from "./main";
import { openBuyMeACoffee } from "./constants";
import { t } from "./i18n";
import { openLegalModal } from "./legal";
import { CompareModal } from "./compareModal";
import {
	annotateSameContent,
	countTrashFiles,
	moveToTrash,
	noticeRestoreResult,
	restoreFromTrash,
	runScan,
	ScanCandidate,
} from "./scanner";

function typeLabel(type: ScanCandidate["type"]): string {
	if (type === "conflict") return t("typeConflict");
	if (type === "empty") return t("typeEmpty");
	return t("typeTemp");
}

const TYPE_BADGE_CLASS: Record<ScanCandidate["type"], string> = {
	conflict: "copyguard-badge-conflict",
	empty: "copyguard-badge-empty",
	temp: "copyguard-badge-temp",
};

export class ScanModal extends Modal {
	plugin: CopyGuardPlugin;
	private candidates: ScanCandidate[] = [];
	private selected = new Set<string>();

	private optIncludeConflict: boolean;
	private optIncludeNumbered: boolean;
	private optIncludeEmpty: boolean;
	private optIncludeTemp: boolean;

	private resultsEl!: HTMLElement;
	private footerInfoEl!: HTMLElement;
	private selectSameButtonComponent!: { setDisabled: (v: boolean) => void };
	private moveButtonComponent!: { setDisabled: (v: boolean) => void };

	constructor(app: App, plugin: CopyGuardPlugin) {
		super(app);
		this.plugin = plugin;
		this.optIncludeConflict = plugin.settings.enableConflict;
		this.optIncludeNumbered = plugin.settings.includeNumberedDuplicates;
		this.optIncludeEmpty = plugin.settings.enableEmpty;
		this.optIncludeTemp = plugin.settings.enableTemp;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("copyguard-modal");

		new Setting(contentEl).setName(t("scanModalTitle")).setHeading();
		contentEl.createEl("p", {
			cls: "copyguard-desc",
			text: t("scanModalDesc"),
		});
		const legalBar = contentEl.createDiv({ cls: "copyguard-legal-bar" });
		legalBar.createSpan({
			cls: "copyguard-legal-warn",
			text: t("legalWarnShort"),
		});
		new Setting(legalBar).addButton((btn) =>
			btn.setButtonText(t("disclaimerPrivacy")).onClick(() => openLegalModal(this.app))
		);

		new Setting(contentEl)
			.setName(t("conflictCopies"))
			.setDesc(t("conflictCopiesDesc"))
			.addToggle((toggle) =>
				toggle.setValue(this.optIncludeConflict).onChange((v) => (this.optIncludeConflict = v))
			);

		new Setting(contentEl)
			.setName(t("numberedDuplicatesCaution"))
			.setDesc(t("numberedDuplicatesDesc"))
			.addToggle((toggle) =>
				toggle.setValue(this.optIncludeNumbered).onChange((v) => (this.optIncludeNumbered = v))
			);

		new Setting(contentEl)
			.setName(t("emptyFiles"))
			.setDesc(t("emptyFilesDescDays", { days: this.plugin.settings.emptyMinAgeDays }))
			.addToggle((toggle) => toggle.setValue(this.optIncludeEmpty).onChange((v) => (this.optIncludeEmpty = v)));

		new Setting(contentEl)
			.setName(t("tempFiles"))
			.setDesc(t("tempFilesDescDays", { days: this.plugin.settings.tempMinAgeDays }))
			.addToggle((toggle) => toggle.setValue(this.optIncludeTemp).onChange((v) => (this.optIncludeTemp = v)));

		const scanRow = new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText(t("scanBtn"))
				.setCta()
				.onClick(() => {
					void this.runScanAndRender();
				})
		);
		scanRow.addButton((btn) => {
			btn.setButtonText("☕ Buy Me a Coffee");
			btn.buttonEl.addClass("copyguard-bmc-btn");
			btn.onClick(() => openBuyMeACoffee());
		});

		this.resultsEl = contentEl.createDiv({ cls: "copyguard-results" });
		this.renderEmptyState(t("scanEmptyHint"));

		const footer = contentEl.createDiv({ cls: "copyguard-footer" });
		this.footerInfoEl = footer.createDiv({ cls: "copyguard-footer-info" });
		this.updateFooterInfo();

		new Setting(footer)
			.addButton((btn) => {
				btn
					.setButtonText(t("selectSameContentBtn"))
					.setDisabled(true)
					.onClick(() => {
						this.selectSameContent();
					});
				this.selectSameButtonComponent = btn;
			})
			.addButton((btn) => {
				btn.setButtonText(t("restoreFromTrashBtn")).onClick(() => {
					void this.restoreFromTrashBox();
				});
			})
			.addButton((btn) => {
				btn
					.setButtonText(t("moveToTrashBtn", { folder: this.plugin.settings.trashFolderName }))
					.setCta()
					.setDisabled(true)
					.onClick(() => {
						void this.moveSelected();
					});
				this.moveButtonComponent = btn;
			});
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderEmptyState(message: string): void {
		this.resultsEl.empty();
		this.resultsEl.createDiv({ cls: "copyguard-empty-state", text: message });
	}

	private sameContentCount(): number {
		let n = 0;
		for (let i = 0; i < this.candidates.length; i++) {
			if (this.candidates[i].sameContent === true) {
				n++;
			}
		}
		return n;
	}

	private updateFooterInfo(): void {
		this.footerInfoEl.setText(
			t("selectedCount", { selected: this.selected.size, total: this.candidates.length })
		);
		this.selectSameButtonComponent?.setDisabled(this.sameContentCount() === 0);
		this.moveButtonComponent?.setDisabled(this.selected.size === 0);
	}

	private selectSameContent(): void {
		const paths: string[] = [];
		for (let i = 0; i < this.candidates.length; i++) {
			const candidate = this.candidates[i];
			if (candidate.sameContent === true) {
				paths.push(candidate.file.path);
			}
		}
		if (paths.length === 0) {
			new Notice(t("noSameContent"));
			return;
		}
		this.selected = new Set(paths);
		this.renderResults();
		new Notice(t("selectedSameContent", { count: paths.length }));
	}

	private async runScanAndRender(): Promise<void> {
		this.candidates = runScan(this.app, this.plugin.settings, {
			includeConflict: this.optIncludeConflict,
			includeEmpty: this.optIncludeEmpty,
			includeTemp: this.optIncludeTemp,
			includeNumberedDuplicates: this.optIncludeNumbered,
		});
		await annotateSameContent(this.app, this.candidates);
		this.selected.clear();
		this.renderResults();
	}

	private renderResults(): void {
		this.resultsEl.empty();

		if (this.candidates.length === 0) {
			this.renderEmptyState(t("nothingMatched"));
			this.updateFooterInfo();
			return;
		}

		const groups: ScanCandidate["type"][] = ["conflict", "empty", "temp"];
		for (const type of groups) {
			const items = this.candidates.filter((c) => c.type === type);
			if (items.length === 0) continue;
			if (type === "conflict") {
				items.sort((a, b) => Number(b.sameContent === true) - Number(a.sameContent === true));
			}

			this.resultsEl.createDiv({
				cls: "copyguard-group-title",
				text: t("typeGroupCount", { label: typeLabel(type), count: items.length }),
			});

			for (const candidate of items) {
				this.renderItem(candidate);
			}
		}

		this.updateFooterInfo();
	}

	private renderItem(candidate: ScanCandidate): void {
		const row = this.resultsEl.createDiv({ cls: "copyguard-item" });
		const checkbox = row.createEl("input", { type: "checkbox" });
		checkbox.checked = this.selected.has(candidate.file.path);
		checkbox.addEventListener("change", () => {
			if (checkbox.checked) this.selected.add(candidate.file.path);
			else this.selected.delete(candidate.file.path);
			this.updateFooterInfo();
		});

		const main = row.createDiv({ cls: "copyguard-item-main" });
		const badges = main.createDiv({ cls: "copyguard-item-badges" });
		badges.createSpan({
			cls: `copyguard-badge ${TYPE_BADGE_CLASS[candidate.type]}`,
			text: typeLabel(candidate.type),
		});
		if (candidate.sameContent === true) {
			badges.createSpan({
				cls: "copyguard-badge copyguard-badge-same",
				text: t("nameOnly"),
			});
		}
		main.createDiv({ cls: "copyguard-item-path", text: candidate.file.path });
		main.createDiv({ cls: "copyguard-item-reason", text: candidate.reason });
		if (candidate.pairPath) {
			const actions = row.createDiv({ cls: "copyguard-item-actions" });
			const compareBtn = actions.createEl("button", {
				text: t("compareBtn"),
				cls: "copyguard-compare-btn",
			});
			compareBtn.addEventListener("click", (event) => {
				event.preventDefault();
				new CompareModal(this.app, candidate).open();
			});
		}
	}

	private async moveSelected(): Promise<void> {
		const targets = this.candidates.filter((c) => this.selected.has(c.file.path)).map((c) => c.file);
		if (targets.length === 0) return;

		const folder = this.plugin.settings.trashFolderName;
		const { moved, failed, indexSaved } = await moveToTrash(this.app, folder, targets);

		this.candidates = this.candidates.filter((c) => !this.selected.has(c.file.path) || failed.includes(c.file));
		this.selected.clear();
		this.renderResults();

		if (moved > 0) {
			new Notice(t("movedCount", { count: moved, folder }));
		}
		if (failed.length > 0) {
			new Notice(t("moveFailed", { count: failed.length }));
		}
		if (!indexSaved) {
			new Notice(t("indexSaveFailed"));
		}
	}

	private async restoreFromTrashBox(): Promise<void> {
		if (countTrashFiles(this.app, this.plugin.settings.trashFolderName) === 0) {
			new Notice(t("restoreEmpty"));
			return;
		}
		const result = await restoreFromTrash(this.app, this.plugin.settings.trashFolderName);
		noticeRestoreResult(result);
	}
}
