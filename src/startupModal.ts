import { App, Modal, Notice } from "obsidian";
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

		contentEl.createEl("h2", { text: "CopyGuard" });
		contentEl.createEl("p", {
			text: t(
				`「${this.plugin.settings.trashFolderName}」に ${this.fileCount} 件のファイルがあります。削除しますか？`,
				`“${this.plugin.settings.trashFolderName}” has ${this.fileCount} file(s). Delete them?`,
				`„${this.plugin.settings.trashFolderName}“ enthält ${this.fileCount} Datei(en). Löschen?`
			),
		});
		contentEl.createEl("p", {
			cls: "copyguard-desc",
			text: this.plugin.settings.useSystemTrashForFinalDelete
				? t(
						"OS のゴミ箱に送ります。必要なら後で復元できます。同期している場合は他の端末からも消えることがあります。削除は自己責任です。",
						"Files go to the system trash and can be restored later. If you sync, they may also vanish on other devices. Deleting is at your own risk.",
						"Dateien kommen in den System-Papierkorb und sind später wiederherstellbar. Bei Sync können sie auch auf anderen Geräten verschwinden. Löschen auf eigene Verantwortung."
					)
				: t(
						"この操作は完全削除です。復元できません。同期している場合は他の端末からも消えることがあります。削除は自己責任です。",
						"This permanently deletes. It cannot be undone. If you sync, other devices may lose the files too. Deleting is at your own risk.",
						"Dies löscht endgültig. Es gibt kein Zurück. Bei Sync können die Dateien auch auf anderen Geräten fehlen. Löschen auf eigene Verantwortung."
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
		deleteBtn.addEventListener("click", () => this.confirmDelete());
	}

	private async confirmDelete(): Promise<void> {
		const deleted = await emptyTrashFolder(
			this.app,
			this.plugin.settings.trashFolderName,
			this.plugin.settings.useSystemTrashForFinalDelete
		);
		new Notice(
			t(`${deleted}件を削除しました。`, `Deleted ${deleted}.`, `${deleted} gelöscht.`)
		);
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
