# Changelog

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
