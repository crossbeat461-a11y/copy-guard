import { App, Modal, Notice, Setting } from "obsidian";
import type CopyGuardPlugin from "./main";
import { t } from "./i18n";
import { countTrashFiles, emptyTrashFolder, noticeRestoreResult, restoreFromTrash } from "./scanner";

export class TrashConfirmModal extends Modal {
	plugin: CopyGuardPlugin;
	fileCount: number;
	private countEl!: HTMLParagraphElement;

	constructor(app: App, plugin: CopyGuardPlugin, fileCount: number) {
		super(app);
		this.plugin = plugin;
		this.fileCount = fileCount;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		new Setting(contentEl).setName(t("deleteQuarantineHeading")).setHeading();
		this.countEl = contentEl.createEl("p", {
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

		const restoreBtn = buttonRow.createEl("button", {
			text: t("restoreFromTrashBtn"),
		});
		restoreBtn.addEventListener("click", () => {
			void this.confirmRestore();
		});

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

	private async confirmRestore(): Promise<void> {
		const result = await restoreFromTrash(this.app, this.plugin.settings.trashFolderName);
		noticeRestoreResult(result);
		const remaining = countTrashFiles(this.app, this.plugin.settings.trashFolderName);
		this.fileCount = remaining;
		if (remaining === 0) {
			this.close();
			return;
		}
		this.countEl.setText(
			t("trashHasFiles", {
				folder: this.plugin.settings.trashFolderName,
				count: remaining,
			})
		);
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
