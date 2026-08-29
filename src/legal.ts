import { App, Modal, Setting } from "obsidian";
import { t } from "./i18n";

export function appendLegalBody(el: HTMLElement): void {
	new Setting(el).setName(t("免責（無保証）", "Disclaimer (no warranty)", "Haftungsausschluss (ohne Gewähr)")).setHeading();
	const disclaimer = [
		t(
			"CopyGuard は現状有姿（無保証）で提供します。あらゆる環境での動作を保証しません。ご利用は自己責任です。",
			"CopyGuard is provided as is, without warranty. It is not guaranteed to work in every environment. Use it at your own risk.",
			"CopyGuard wird ohne Gewähr (wie besehen) bereitgestellt. Ein Funktionieren in jeder Umgebung wird nicht zugesichert. Die Nutzung erfolgt auf eigene Verantwortung."
		),
		t(
			"競合コピー・空ファイル・一時ファイルの判定は、ファイル名と大きさなどの手がかりによるものです。本番のノートを誤って候補に出すことがあります。移動や削除の前に、一覧を必ずご自身で確認してください。",
			"Conflict copies, empty files, and temp files are judged from names and size. A real note can be listed by mistake. Always review the list yourself before moving or deleting.",
			"Konfliktkopien, leere Dateien und temporäre Dateien werden anhand von Namen und Größe erkannt. Eine echte Notiz kann fälschlich erscheinen. Prüfen Sie die Liste selbst, bevor Sie verschieben oder löschen."
		),
		t(
			"隔離フォルダへの移動や、その後の削除は取り消せないことがあります。同期（iCloud / Dropbox / Remotely Save など）を使っている場合、他の端末にも同じ変更が広がることがあります。",
			"Moves into the quarantine folder, and later deletes, may not be undoable. If you sync (iCloud / Dropbox / Remotely Save, and similar), the same change can spread to other devices.",
			"Verschieben in den Quarantäneordner und späteres Löschen sind oft nicht rückgängig zu machen. Bei Sync (iCloud / Dropbox / Remotely Save u. a.) kann dieselbe Änderung auf andere Geräte gelangen."
		),
		t(
			"本プラグインの利用によって生じたデータの消失、同期の不整合、その他の損害について、K-Tech Studio は責任を負いません。詳細は MIT ライセンスに従います。",
			"K-Tech Studio is not liable for data loss, sync mismatch, or other damage from using this plugin. The MIT license applies.",
			"K-Tech Studio haftet nicht für Datenverlust, Sync-Abweichungen oder andere Schäden durch die Nutzung. Es gilt die MIT-Lizenz."
		),
		t(
			"Obsidian、Dropbox、Apple、その他の同期サービスの公式製品ではありません。",
			"This is not an official product of Obsidian, Dropbox, Apple, or any other sync service.",
			"Dies ist kein offizielles Produkt von Obsidian, Dropbox, Apple oder anderen Sync-Diensten."
		),
	];
	for (const para of disclaimer) {
		el.createEl("p", { cls: "copyguard-legal-p", text: para });
	}

	new Setting(el).setName(t("プライバシー", "Privacy", "Datenschutz")).setHeading();
	const privacy = [
		t(
			"CopyGuard は、点検・移動・削除をこの端末の Vault の中だけで行います。利用状況の収集や、外部への送信はありません。",
			"CopyGuard inspects, moves, and deletes only inside this vault on this device. It does not collect usage data or send it out.",
			"CopyGuard prüft, verschiebt und löscht nur im Vault auf diesem Gerät. Es gibt keine Nutzungsstatistik und keine Übertragung nach außen."
		),
		t(
			"設定は Vault 内のプラグインフォルダ（data.json）に保存します。個人情報の送信はしません。",
			"Settings are stored in the plugin folder in the vault (data.json). No personal data is sent.",
			"Einstellungen liegen im Plugin-Ordner des Vaults (data.json). Es werden keine personenbezogenen Daten gesendet."
		),
		t(
			"Buy Me a Coffee のボタンを押したときだけ、ブラウザで外部サイトが開きます。プラグイン本体がアカウント情報を送ることはありません。",
			"Only when you press Buy Me a Coffee does a browser open an external site. The plugin itself does not send account data.",
			"Nur wenn Sie Buy Me a Coffee drücken, öffnet der Browser eine externe Seite. Das Plugin selbst sendet keine Kontodaten."
		),
	];
	for (const para of privacy) {
		el.createEl("p", { cls: "copyguard-legal-p", text: para });
	}
}

export class LegalModal extends Modal {
	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("copyguard-legal-modal");
		new Setting(contentEl)
			.setName(t("CopyGuard — 免責とプライバシー", "CopyGuard — Disclaimer and privacy", "CopyGuard — Haftung und Datenschutz"))
			.setHeading();
		appendLegalBody(contentEl);

		new Setting(contentEl).addButton((btn) =>
			btn.setButtonText(t("閉じる", "Close", "Schließen")).setCta().onClick(() => this.close())
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

export function openLegalModal(app: App): void {
	new LegalModal(app).open();
}
