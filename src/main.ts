import { Plugin } from "obsidian";
import { t } from "./i18n";
import { CopyGuardSettings, CopyGuardSettingTab, DEFAULT_SETTINGS } from "./settings";
import { countTrashFiles } from "./scanner";
import { ScanModal } from "./scanModal";
import { TrashConfirmModal } from "./startupModal";

export default class CopyGuardPlugin extends Plugin {
	settings: CopyGuardSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new CopyGuardSettingTab(this.app, this));

		this.addRibbonIcon("copy", t("CopyGuardを開く", "Open CopyGuard", "CopyGuard öffnen"), () => {
			new ScanModal(this.app, this).open();
		});

		this.addCommand({
			id: "open-scan",
			name: t("CopyGuardを開く", "Open CopyGuard", "CopyGuard öffnen"),
			callback: () => {
				new ScanModal(this.app, this).open();
			},
		});

		this.app.workspace.onLayoutReady(() => {
			this.maybeShowTrashConfirm();
		});
	}

	onunload(): void {
		// Nothing to clean up; modals close themselves.
	}

	private maybeShowTrashConfirm(): void {
		if (!this.settings.confirmTrashOnStartup) return;
		const count = countTrashFiles(this.app, this.settings.trashFolderName);
		if (count > 0) {
			new TrashConfirmModal(this.app, this, count).open();
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
