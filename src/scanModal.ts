import { App, Modal, Notice, Setting } from "obsidian";
import type CopyGuardPlugin from "./main";
import { openBuyMeACoffee } from "./constants";
import { t } from "./i18n";
import { openLegalModal } from "./legal";
import { moveToTrash, runScan, ScanCandidate } from "./scanner";

function typeLabel(type: ScanCandidate["type"]): string {
	if (type === "conflict") return t("競合コピー", "Conflict copy", "Konfliktkopie");
	if (type === "empty") return t("空ファイル", "Empty file", "Leere Datei");
	return t("一時・破損", "Temp / corrupt", "Temp. / beschädigt");
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

		new Setting(contentEl)
			.setName(t("CopyGuard — 競合コピーの点検", "CopyGuard — review conflict copies", "CopyGuard — Konfliktkopien prüfen"))
			.setHeading();
		contentEl.createEl("p", {
			cls: "copyguard-desc",
			text: t(
				"チェックした項目だけ調べます。見つかったものは、選んで隔離フォルダへ移すだけです。ここでは削除しません。ご利用は自己責任です。",
				"Only checked items are scanned. You choose what to move into the quarantine folder. Nothing is deleted here. Use at your own risk.",
				"Es wird nur geprüft, was Sie ankreuzen. Sie wählen, was in den Quarantäneordner kommt. Hier wird nichts gelöscht. Nutzung auf eigene Verantwortung."
			),
		});
		const legalBar = contentEl.createDiv({ cls: "copyguard-legal-bar" });
		legalBar.createSpan({
			cls: "copyguard-legal-warn",
			text: t(
				"判定は誤ることがあります。移動・削除の前に一覧を確認してください。同期している場合は他の端末にも広がります。",
				"Detection can be wrong. Review the list before moving or deleting. If you sync, other devices can get the same change.",
				"Die Erkennung kann irren. Prüfen Sie die Liste vor dem Verschieben oder Löschen. Bei Sync kann die Änderung andere Geräte erreichen."
			),
		});
		new Setting(legalBar).addButton((btn) =>
			btn
				.setButtonText(t("免責とプライバシー", "Disclaimer and privacy", "Haftung und Datenschutz"))
				.onClick(() => openLegalModal(this.app))
		);

		new Setting(contentEl)
			.setName(t("競合コピー", "Conflict copies", "Konfliktkopien"))
			.setDesc(
				t(
					"同じフォルダに元ファイルがあるものだけ対象にします。",
					"Only when the original file is in the same folder.",
					"Nur wenn die Originaldatei im selben Ordner liegt."
				)
			)
			.addToggle((toggle) =>
				toggle.setValue(this.optIncludeConflict).onChange((v) => (this.optIncludeConflict = v))
			);

		new Setting(contentEl)
			.setName(t("番号付きの重複も含める（要注意）", "Include numbered duplicates (caution)", "Nummerierte Duplikate (Vorsicht)"))
			.setDesc(
				t(
					"「◯◯ 2.md」のような番号違い。誤検知が増えます。",
					"Names like “Note 2.md”. More false matches.",
					"Namen wie „Notiz 2.md“. Mehr Fehltreffer."
				)
			)
			.addToggle((toggle) =>
				toggle.setValue(this.optIncludeNumbered).onChange((v) => (this.optIncludeNumbered = v))
			);

		new Setting(contentEl)
			.setName(t("空ファイル（0バイト）", "Empty files (0 bytes)", "Leere Dateien (0 Byte)"))
			.setDesc(
				t(
					`更新から${this.plugin.settings.emptyMinAgeDays}日以上経ったものだけ対象にします。`,
					`Only files last modified at least ${this.plugin.settings.emptyMinAgeDays} days ago.`,
					`Nur Dateien, die vor mindestens ${this.plugin.settings.emptyMinAgeDays} Tagen geändert wurden.`
				)
			)
			.addToggle((toggle) => toggle.setValue(this.optIncludeEmpty).onChange((v) => (this.optIncludeEmpty = v)));

		new Setting(contentEl)
			.setName(t("一時・破損ファイル", "Temp / corrupt files", "Temporäre / beschädigte Dateien"))
			.setDesc(
				t(
					`.tmp や ~ で終わるファイルなど。更新から${this.plugin.settings.tempMinAgeDays}日以上経ったものだけ対象にします。`,
					`.tmp and names ending in ~, and similar. Only if last modified at least ${this.plugin.settings.tempMinAgeDays} days ago.`,
					`.tmp und Namen mit ~ am Ende u. a. Nur wenn vor mindestens ${this.plugin.settings.tempMinAgeDays} Tagen geändert.`
				)
			)
			.addToggle((toggle) => toggle.setValue(this.optIncludeTemp).onChange((v) => (this.optIncludeTemp = v)));

		const scanRow = new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText(t("スキャン実行", "Scan", "Prüfen"))
				.setCta()
				.onClick(() => this.runScanAndRender())
		);
		scanRow.addButton((btn) => {
			btn.setButtonText("☕ Buy Me a Coffee");
			btn.buttonEl.addClass("copyguard-bmc-btn");
			btn.onClick(() => openBuyMeACoffee());
		});

		this.resultsEl = contentEl.createDiv({ cls: "copyguard-results" });
		this.renderEmptyState(
			t(
				"チェックを確認して「スキャン実行」を押してください。",
				"Review the checkboxes, then press Scan.",
				"Häkchen prüfen, dann Prüfen drücken."
			)
		);

		const footer = contentEl.createDiv({ cls: "copyguard-footer" });
		this.footerInfoEl = footer.createDiv({ cls: "copyguard-footer-info" });
		this.updateFooterInfo();

		new Setting(footer).addButton((btn) => {
			btn
				.setButtonText(
					t(
						`選択したものを「${this.plugin.settings.trashFolderName}」へ移動`,
						`Move selected to “${this.plugin.settings.trashFolderName}”`,
						`Auswahl nach „${this.plugin.settings.trashFolderName}“ verschieben`
					)
				)
				.setCta()
				.setDisabled(true)
				.onClick(() => this.moveSelected());
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

	private updateFooterInfo(): void {
		this.footerInfoEl.setText(
			t(
				`選択中: ${this.selected.size} / ${this.candidates.length} 件`,
				`Selected: ${this.selected.size} / ${this.candidates.length}`,
				`Ausgewählt: ${this.selected.size} / ${this.candidates.length}`
			)
		);
		this.moveButtonComponent?.setDisabled(this.selected.size === 0);
	}

	private runScanAndRender(): void {
		this.candidates = runScan(this.app, this.plugin.settings, {
			includeConflict: this.optIncludeConflict,
			includeEmpty: this.optIncludeEmpty,
			includeTemp: this.optIncludeTemp,
			includeNumberedDuplicates: this.optIncludeNumbered,
		});
		this.selected.clear();
		this.renderResults();
	}

	private renderResults(): void {
		this.resultsEl.empty();

		if (this.candidates.length === 0) {
			this.renderEmptyState(t("対象は見つかりませんでした。", "Nothing matched.", "Keine Treffer."));
			this.updateFooterInfo();
			return;
		}

		const groups: ScanCandidate["type"][] = ["conflict", "empty", "temp"];
		for (const type of groups) {
			const items = this.candidates.filter((c) => c.type === type);
			if (items.length === 0) continue;

			this.resultsEl.createDiv({
				cls: "copyguard-group-title",
				text: t(
					`${typeLabel(type)}（${items.length}件）`,
					`${typeLabel(type)} (${items.length})`,
					`${typeLabel(type)} (${items.length})`
				),
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
		main.createSpan({
			cls: `copyguard-badge ${TYPE_BADGE_CLASS[candidate.type]}`,
			text: typeLabel(candidate.type),
		});
		main.createDiv({ cls: "copyguard-item-path", text: candidate.file.path });
		main.createDiv({ cls: "copyguard-item-reason", text: candidate.reason });
	}

	private async moveSelected(): Promise<void> {
		const targets = this.candidates.filter((c) => this.selected.has(c.file.path)).map((c) => c.file);
		if (targets.length === 0) return;

		const { moved, failed } = await moveToTrash(this.app, this.plugin.settings.trashFolderName, targets);

		this.candidates = this.candidates.filter((c) => !this.selected.has(c.file.path) || failed.includes(c.file));
		this.selected.clear();
		this.renderResults();

		if (moved > 0) {
			new Notice(
				t(
					`${moved}件を「${this.plugin.settings.trashFolderName}」へ移動しました。`,
					`Moved ${moved} to “${this.plugin.settings.trashFolderName}”.`,
					`${moved} nach „${this.plugin.settings.trashFolderName}“ verschoben.`
				)
			);
		}
		if (failed.length > 0) {
			new Notice(
				t(
					`${failed.length}件は移動できませんでした。開いているファイル等をご確認ください。`,
					`${failed.length} could not be moved. Check open files and similar.`,
					`${failed.length} konnten nicht verschoben werden. Prüfen Sie geöffnete Dateien.`
				)
			);
		}
	}
}
