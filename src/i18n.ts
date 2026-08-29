import { getLanguage } from "obsidian";

export type UiLang = "ja" | "en" | "de";

function readStoredLanguage(): string {
	try {
		return String((window.localStorage && window.localStorage.getItem("language")) || "");
	} catch {
		return "";
	}
}

function readAppLanguage(): string {
	try {
		if (typeof getLanguage === "function") {
			return String(getLanguage() || "");
		}
	} catch {
		/* older Obsidian */
	}
	return "";
}

function readSystemLanguage(): string {
	try {
		const html = String(document.documentElement?.lang || "");
		if (html) return html;
	} catch {
		/* ignore */
	}
	try {
		return String(navigator.language || navigator.languages?.[0] || "");
	} catch {
		return "";
	}
}

function toUiLang(raw: string): UiLang | null {
	const lang = raw.toLowerCase().replace(/_/g, "-");
	if (lang.startsWith("ja")) return "ja";
	if (lang.startsWith("de")) return "de";
	if (lang.startsWith("en")) return "en";
	return null;
}

/**
 * Prefer an explicit Obsidian language setting.
 * "Match system" often leaves localStorage empty — then use the OS / HTML locale,
 * not English by default (Japanese Macs would otherwise get English UI).
 */
export function uiLang(): UiLang {
	const stored = toUiLang(readStoredLanguage());
	if (stored) return stored;

	const app = toUiLang(readAppLanguage());
	if (app && app !== "en") return app;

	const system = toUiLang(readSystemLanguage());
	if (system) return system;

	if (app) return app;
	return "en";
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
