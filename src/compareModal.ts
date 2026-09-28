import { App, Modal, Setting, TFile } from "obsidian";
import { t } from "./i18n";
import type { ScanCandidate } from "./scanner";

const TEXT_EXTENSIONS = new Set([
	"md",
	"markdown",
	"txt",
	"csv",
	"json",
	"css",
	"js",
	"ts",
	"html",
	"xml",
	"yaml",
	"yml",
	"toml",
	"ini",
	"svg",
	"canvas",
	"base",
	"log",
]);

const BINARY_EXTENSIONS = new Set([
	"png",
	"jpg",
	"jpeg",
	"gif",
	"webp",
	"pdf",
	"zip",
	"mp3",
	"mp4",
	"mov",
	"avi",
	"mkv",
	"docx",
	"xlsx",
	"pptx",
	"icns",
	"ico",
]);

function looksLikeText(buffer: ArrayBuffer): boolean {
	const bytes = new Uint8Array(buffer);
	const n = Math.min(bytes.length, 8192);
	for (let i = 0; i < n; i++) {
		if (bytes[i] === 0) return false;
	}
	return true;
}

function formatMtime(mtime: number): string {
	return new Date(mtime).toLocaleString();
}

function appendBinaryMeta(el: HTMLElement, file: TFile): void {
	el.createEl("p", {
		cls: "copyguard-desc",
		text: t("compareBinaryMeta", {
			name: file.name,
			size: file.stat.size,
			mtime: formatMtime(file.stat.mtime),
		}),
	});
}

export class CompareModal extends Modal {
	private candidate: ScanCandidate;

	constructor(app: App, candidate: ScanCandidate) {
		super(app);
		this.candidate = candidate;
	}

	onOpen(): void {
		void this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async render(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("copyguard-compare-modal");

		new Setting(contentEl).setName(t("compareModalTitle")).setHeading();

		if (this.candidate.sameContent === true) {
			contentEl.createEl("p", {
				cls: "copyguard-desc",
				text: t("compareNameOnly"),
			});
			contentEl.createEl("p", {
				cls: "copyguard-item-path",
				text: this.candidate.file.path,
			});
			if (this.candidate.pairPath) {
				contentEl.createEl("p", {
					cls: "copyguard-item-path",
					text: this.candidate.pairPath,
				});
			}
			this.addCloseButton();
			return;
		}

		const pairPath = this.candidate.pairPath;
		if (!pairPath) {
			contentEl.createEl("p", { cls: "copyguard-desc", text: t("noOriginal") });
			this.addCloseButton();
			return;
		}

		const original = this.app.vault.getAbstractFileByPath(pairPath);
		const copy = this.candidate.file;
		if (!(original instanceof TFile)) {
			contentEl.createEl("p", { cls: "copyguard-desc", text: t("compareReadFailed") });
			this.addCloseButton();
			return;
		}

		if (this.candidate.sameContent === false) {
			contentEl.createEl("p", { cls: "copyguard-desc", text: t("compareDifferentBytes") });
		}

		let showText = false;
		try {
			showText = await this.shouldShowText(copy, original);
		} catch {
			contentEl.createEl("p", { cls: "copyguard-desc", text: t("compareReadFailed") });
			this.addCloseButton();
			return;
		}

		if (!showText) {
			contentEl.createEl("p", { text: `${t("compareOriginalLabel")}: ${original.path}` });
			appendBinaryMeta(contentEl, original);
			contentEl.createEl("p", { text: `${t("compareCopyLabel")}: ${copy.path}` });
			appendBinaryMeta(contentEl, copy);
			this.addCloseButton();
			return;
		}

		try {
			const originalText = await this.app.vault.read(original);
			const copyText = await this.app.vault.read(copy);
			this.appendTextPane(t("compareOriginalLabel"), original.path, originalText);
			this.appendTextPane(t("compareCopyLabel"), copy.path, copyText);
		} catch {
			contentEl.createEl("p", { cls: "copyguard-desc", text: t("compareReadFailed") });
		}
		this.addCloseButton();
	}

	private async shouldShowText(copy: TFile, original: TFile): Promise<boolean> {
		const copyExt = copy.extension.toLowerCase();
		const origExt = original.extension.toLowerCase();
		if (BINARY_EXTENSIONS.has(copyExt) || BINARY_EXTENSIONS.has(origExt)) return false;
		if (TEXT_EXTENSIONS.has(copyExt) && TEXT_EXTENSIONS.has(origExt)) return true;
		const left = await this.app.vault.readBinary(copy);
		const right = await this.app.vault.readBinary(original);
		return looksLikeText(left) && looksLikeText(right);
	}

	private appendTextPane(label: string, path: string, body: string): void {
		this.contentEl.createEl("p", { cls: "copyguard-compare-label", text: `${label}: ${path}` });
		const pre = this.contentEl.createEl("pre", { cls: "copyguard-compare-pre" });
		pre.textContent = body;
	}

	private addCloseButton(): void {
		new Setting(this.contentEl).addButton((btn) =>
			btn.setButtonText(t("close")).setCta().onClick(() => this.close())
		);
	}
}
