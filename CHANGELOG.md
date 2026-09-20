# Changelog

## 1.2.0

- Scan: select every conflict copy that has the same bytes as the original in the same folder. Review the checks, then move. Still does not merge

### 日本語

- スキャン: 同じフォルダの元ファイルと中身が同じ競合コピーだけをまとめて選ぶ。確認してから移動する。マージはしない

## 1.1.1

- Detect Proton Drive names: `(# Edit conflict …)` and `(# Name clash …)`, including several suffixes on one file
- Detect official Sync files named `Note-conflict-YYYY-MM-DD` (optional time)
- When the original is in the same folder, show if the copy has the same bytes

### 日本語

- Proton Drive の `(# Edit conflict …)` / `(# Name clash …)` を検出。同じファイルに複数付いていても元の名前まで戻す
- 公式 Sync の `Note-conflict-YYYY-MM-DD`（時刻付きも）を検出
- 同じフォルダに元があるとき、中身が同じなら一覧に出す

## 1.1.0

- Style the Buy Me a Coffee button with CSS variables and higher specificity (no `!important`)

## 1.0.6

- Detect official Sync leftovers (`Note (conflict 2026-08-31 1234)`)
- Detect Dropbox names in Korean, Chinese, Spanish, and Portuguese
- Detect Nextcloud `Note_conflict-YYYYMMDD-HHMMSS`
- List name-pattern matches even when the original is missing from the same folder

## 1.0.5

- Detect Dropbox conflict copies that put the account name before `競合コピー` / `conflicted copy` (Japanese and English)

## 1.0.4

- UI in 8 languages: Japanese, English, German, Korean, Simplified Chinese, Traditional Chinese (Taiwan), Spanish, Portuguese
- Settings use tag-style section tabs (General / Scan / Delete / Info)
- GitHub Issues link and banner for bug reports
- Warning modal when enabling “Ask on startup” for quarantine delete

## 1.0.3

- Community review warnings: drop `builtin-modules`, use `getLanguage()`, typed settings load, `createDiv`/`createSpan`, `FileManager.trashFile()`, settings search via `getSettingDefinitions()`, no floating Promise in the confirm click
- `minAppVersion` is 1.8.7 (`getLanguage`)
- Final delete follows the app’s Deleted files setting (no extra OS-trash toggle)

## 1.0.2

- Settings: do not use the plugin name as a heading

## 1.0.1

- Keep `minAppVersion` 1.5.0: detect UI language without `getLanguage`
- Use `Setting.setHeading()` in settings (and related headings)

## 1.0.0

- Review conflict copies (English / Japanese / German names, Syncthing), empty files, and leftover temp files
- Move only what you select into `K-Tech Trash Box`
- Ask before deleting from that folder (default is keep)
- UI follows the app language: Japanese, English, or German
- Disclaimer and privacy text in the plugin
- Buy Me a Coffee (optional)
