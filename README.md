# CopyGuard

[![GitHub release](https://img.shields.io/github/v/release/crossbeat461-a11y/copy-guard?style=for-the-badge&display_name=tag)](https://github.com/crossbeat461-a11y/copy-guard/releases/latest)
[![License: MIT](https://img.shields.io/github/license/crossbeat461-a11y/copy-guard?style=for-the-badge)](LICENSE)
[![Release](https://img.shields.io/github/actions/workflow/status/crossbeat461-a11y/copy-guard/release.yml?style=for-the-badge&label=Release)](https://github.com/crossbeat461-a11y/copy-guard/actions/workflows/release.yml)
![App 1.8.7+](https://img.shields.io/badge/App-1.8.7%2B-483699?style=for-the-badge)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/k_tech_studio)

**[English](#readme-en)** · **[日本語](#readme-ja)** · **[Deutsch](#readme-de)**

K-Tech Studio plugin that finds **sync-conflict copies**, empty files, and leftover temp files. You review the list, then move only what you approve into a dedicated folder. Deleting is a second step, at your own risk.

---

<a id="readme-en"></a>

## English

### What it does

- Detects conflict copies **in the same folder as the original** (Dropbox / iCloud / Remotely Save / official Sync / Syncthing name patterns; Japanese, English, German)
- Optional numbered names like `Note 2.md` (off by default — easy to confuse with a real title)
- Empty (0-byte) files and temp leftovers (`.tmp`, trailing `~`, Office lock files), with a minimum age in days
- Skips `.icloud` placeholders and files you currently have open
- Moves selected files to **K-Tech Trash Box** (name is configurable)
- On startup, if that folder has files, asks whether to delete. **Default is keep**
- UI: Japanese / English / German / Korean / Simplified Chinese / Traditional Chinese (Taiwan) / Spanish / Portuguese from the app language

### What it does not do

- It does not merge conflict copies
- It does not delete until you confirm the quarantine folder
- It cannot stop iCloud or Dropbox from creating copies

### How to use

1. Enable **CopyGuard**
2. Click the ribbon icon (two overlapping pages) or run **Open CopyGuard**
3. Check what to scan, then **Scan**
4. Select rows and move them to the trash box
5. Delete from that folder only when you mean to (startup prompt, default: later)

### Install (manual)

Download `main.js`, `manifest.json`, and `styles.css` from [Releases](https://github.com/crossbeat461-a11y/copy-guard/releases/latest) into `<vault>/.obsidian/plugins/copy-guard/`, then enable the plugin.

### Author

K-Tech Studio

### Support

[Buy Me a Coffee](https://buymeacoffee.com/k_tech_studio)

### Disclaimer (no warranty)

This software is provided **as is**, without warranty. Detection can be wrong. Moves and deletes may sync to other devices. Use at your own risk. See the [MIT License](LICENSE).

### Privacy

Work stays in this vault on this device. Settings are stored in `data.json`. No telemetry. Buy Me a Coffee opens in the browser only if you click it.

### License

MIT

---

<a id="readme-ja"></a>

## 日本語

同期で隣に増えた競合コピー、空ファイル、一時ファイルを点検します。選んだものだけ隔離フォルダへ移します。削除は二段階で、既定は消さないです。ご利用は自己責任です。

### 使い方

1. CopyGuard を有効にする
2. 左リボン（重なったページのアイコン）かコマンド「CopyGuardを開く」
3. 項目にチェックしてスキャン
4. 選んで **K-Tech Trash Box** へ移動
5. 隔離フォルダの削除は、起動時の確認で本人が選ぶ

手動インストールは [Releases](https://github.com/crossbeat461-a11y/copy-guard/releases/latest) の `main.js` / `manifest.json` / `styles.css` を `<vault>/.obsidian/plugins/copy-guard/` へ。

### 免責（無保証）

現状有姿です。判定は誤ることがあります。移動・削除は同期経由で他の端末にも広がることがあります。詳細は [MIT ライセンス](LICENSE) です。

---

<a id="readme-de"></a>

## Deutsch

CopyGuard findet Konfliktkopien im selben Ordner, leere Dateien und temporäre Reste. UI: Japanisch, Englisch, Deutsch, Koreanisch, Chinesisch (vereinfacht / traditionell), Spanisch, Portugiesisch.

Manuelle Installation: Dateien aus [Releases](https://github.com/crossbeat461-a11y/copy-guard/releases/latest) nach `<vault>/.obsidian/plugins/copy-guard/`.

### Haftung (ohne Gewähr)

Die Software wird ohne Gewähr bereitgestellt. Die Erkennung kann irren. Verschieben und Löschen können per Sync andere Geräte erreichen. Siehe [MIT-Lizenz](LICENSE).
