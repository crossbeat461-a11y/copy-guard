import { App, Modal, Setting } from "obsidian";
import { t } from "./i18n";

export class EnableStartupConfirmModal extends Modal {
	private readonly resolve: (confirmed: boolean) => void;

	constructor(app: App, resolve: (confirmed: boolean) => void) {
		super(app);
		this.resolve = resolve;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		new Setting(contentEl)
			.setName(t("enableStartupConfirmTitle"))
			.setHeading();

		contentEl.createEl("p", {
			cls: "copyguard-desc",
			text: t("enableStartupConfirmBody"),
		});

		const buttonRow = contentEl.createDiv({ cls: "copyguard-footer" });

		const cancelBtn = buttonRow.createEl("button", {
			text: t("cancel"),
		});
		cancelBtn.addEventListener("click", () => this.finish(false));

		const enableBtn = buttonRow.createEl("button", {
			text: t("enableStartupConfirmEnable"),
			cls: "mod-cta",
		});
		enableBtn.addEventListener("click", () => this.finish(true));
	}

	private finish(confirmed: boolean): void {
		this.close();
		this.resolve(confirmed);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export function promptEnableStartupConfirm(app: App): Promise<boolean> {
	return new Promise((resolve) => {
		new EnableStartupConfirmModal(app, resolve).open();
	});
}
