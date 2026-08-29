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

		new Setting(contentEl).setName(t("隔離フォルダの削除", "Delete quarantine files", "Quarantäne löschen")).setHeading();
		contentEl.createEl("p", {
			text: t(
				`「${this.plugin.settings.trashFolderName}」に ${this.fileCount} 件のファイルがあります。削除しますか？`,
				`“${this.plugin.settings.trashFolderName}” has ${this.fileCount} file(s). Delete them?`,
				`„${this.plugin.settings.trashFolderName}“ enthält ${this.fileCount} Datei(en). Löschen?`
			),
		});
		contentEl.createEl("p", {
			cls: "copyguard-desc",
			text: t(
				"削除はアプリの「削除したファイル」の設定に従います（システムゴミ箱 / .trash / 完全削除）。同期している場合は他の端末からも消えることがあります。削除は自己責任です。",
				"Deletion follows the app’s Deleted files setting (system trash, .trash, or permanent). If you sync, other devices may lose the files too. Deleting is at your own risk.",
				"Das Löschen folgt der App-Einstellung für gelöschte Dateien (System-Papierkorb, .trash oder endgültig). Bei Sync können Dateien auch auf anderen Geräten fehlen. Löschen auf eigene Verantwortung."
			),
		});

		const buttonRow = contentEl.createDiv({ cls: "copyguard-footer" });

		const laterBtn = buttonRow.createEl("button", {
			text: t("後で（このまま残す）", "Later (keep them)", "Später (behalten)"),
		});
		laterBtn.addEventListener("click", () => this.close());

		const deleteBtn = buttonRow.createEl("button", {
			text: t("削除する", "Delete", "Löschen"),
			cls: "mod-warning",
		});
		deleteBtn.addEventListener("click", () => {
			void this.confirmDelete();
		});
	}

	private async confirmDelete(): Promise<void> {
		const deleted = await emptyTrashFolder(this.app, this.plugin.settings.trashFolderName);
		new Notice(
			t(`${deleted}件を削除しました。`, `Deleted ${deleted}.`, `${deleted} gelöscht.`)
		);
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
