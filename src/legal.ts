import { App, Modal, Setting } from "obsidian";
import { t, type MessageKey } from "./i18n";

const LEGAL_DISCLAIMER_KEYS: MessageKey[] = [
	"legalDisclaimer1",
	"legalDisclaimer2",
	"legalDisclaimer3",
	"legalDisclaimer4",
	"legalDisclaimer5",
] as const;

const LEGAL_PRIVACY_KEYS: MessageKey[] = ["legalPrivacy1", "legalPrivacy2", "legalPrivacy3"] as const;

export function appendLegalBody(el: HTMLElement): void {
	new Setting(el).setName(t("legalDisclaimerHeading")).setHeading();
	for (const key of LEGAL_DISCLAIMER_KEYS) {
		el.createEl("p", { cls: "copyguard-legal-p", text: t(key) });
	}

	new Setting(el).setName(t("legalPrivacyHeading")).setHeading();
	for (const key of LEGAL_PRIVACY_KEYS) {
		el.createEl("p", { cls: "copyguard-legal-p", text: t(key) });
	}
}

export class LegalModal extends Modal {
	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("copyguard-legal-modal");
		new Setting(contentEl).setName(t("legalPrivacy")).setHeading();
		appendLegalBody(contentEl);

		new Setting(contentEl).addButton((btn) =>
			btn.setButtonText(t("close")).setCta().onClick(() => this.close())
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export function openLegalModal(app: App): void {
	new LegalModal(app).open();
}
