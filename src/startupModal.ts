import { App, Modal, Notice, Setting } from "obsidian";
import type CopyGuardPlugin from "./main";
import { t } from "./i18n";
import { emptyTrashFolder } from "./scanner";

export class TrashConfirmModal extends Modal {
	plugin: CopyGuardPlugin;
	fileCount: number;

	constructor(app: App, plugin: CopyGuardPlugin, fileCount: number) {
		super(app);
		this.plugin = plugin;
		this.fileCount = fileCount;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		new Setting(contentEl).setName(t("deleteQuarantineHeading")).setHeading();
		contentEl.createEl("p", {
			text: t("trashHasFiles", {
				folder: this.plugin.settings.trashFolderName,
				count: this.fileCount,
			}),
		});
		contentEl.createEl("p", {
			cls: "copyguard-desc",
			text: t("deleteQuarantineWarning"),
		});

		const buttonRow = contentEl.createDiv({ cls: "copyguard-footer" });

		const laterBtn = buttonRow.createEl("button", {
			text: t("laterKeep"),
		});
		laterBtn.addEventListener("click", () => this.close());

		const deleteBtn = buttonRow.createEl("button", {
			text: t("deleteBtn"),
			cls: "mod-warning",
		});
		deleteBtn.addEventListener("click", () => {
			void this.confirmDelete();
		});
	}

	private async confirmDelete(): Promise<void> {
		const deleted = await emptyTrashFolder(this.app, this.plugin.settings.trashFolderName);
		new Notice(t("deletedCount", { count: deleted }));
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
