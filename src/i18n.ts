import { getLanguage } from "obsidian";

export type UiLang = "ja" | "en" | "de";

function toUiLang(raw: string): UiLang | null {
	const lang = raw.toLowerCase().replace(/_/g, "-");
	if (lang.startsWith("ja")) return "ja";
	if (lang.startsWith("de")) return "de";
	if (lang.startsWith("en")) return "en";
	return null;
}

/** App UI language (ISO code). Requires Obsidian 1.8.7+. */
export function uiLang(): UiLang {
	return toUiLang(getLanguage()) ?? "en";
}

export function t(ja: string, en: string, de: string): string {
	const lang = uiLang();
	if (lang === "ja") return ja;
	if (lang === "de") return de;
	return en;
}

export function formatAge(ms: number): string {
	const days = Math.floor(ms / (24 * 60 * 60 * 1000));
	if (days >= 1) {
		return t(`${days}日`, `${days} day${days === 1 ? "" : "s"}`, `${days} Tag${days === 1 ? "" : "e"}`);
	}
	const hours = Math.max(Math.floor(ms / (60 * 60 * 1000)), 1);
	return t(
		`${hours}時間`,
		`${hours} hour${hours === 1 ? "" : "s"}`,
		`${hours} Stunde${hours === 1 ? "" : "n"}`
	);
}
