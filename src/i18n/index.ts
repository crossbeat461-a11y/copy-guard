import { getLanguage } from "obsidian";
import { DEFAULT_LOCALE, LOCALES } from "./locales";
import type { Locale, MessageKey, Vars } from "./types";

function toLocale(raw: string): Locale | null {
	const lang = raw.toLowerCase().replace(/_/g, "-");
	if (lang.startsWith("zh")) {
		if (lang.includes("tw") || lang.includes("hk") || lang.includes("hant")) {
			return "zh-tw";
		}
		return "zh-cn";
	}
	if (lang.startsWith("ja")) return "ja";
	if (lang.startsWith("ko")) return "ko";
	if (lang.startsWith("es")) return "es";
	if (lang.startsWith("de")) return "de";
	if (lang.startsWith("pt")) return "pt";
	if (lang.startsWith("en")) return "en";
	return null;
}

export function uiLocale(): Locale {
	try {
		return toLocale(getLanguage()) ?? DEFAULT_LOCALE;
	} catch {
		return DEFAULT_LOCALE;
	}
}

function applyVars(template: string, vars?: Vars): string {
	if (!vars) return template;
	let out = template;
	for (const key of Object.keys(vars)) {
		out = out.split(`{${key}}`).join(String(vars[key]));
	}
	return out;
}

export function t(key: MessageKey, vars?: Vars): string {
	const locale = uiLocale();
	const table = LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE];
	return applyVars(table[key] ?? LOCALES[DEFAULT_LOCALE][key], vars);
}

export function formatAge(ms: number): string {
	const days = Math.floor(ms / (24 * 60 * 60 * 1000));
	if (days >= 1) {
		return t("ageDays", { count: days });
	}
	const hours = Math.max(Math.floor(ms / (60 * 60 * 1000)), 1);
	return t("ageHours", { count: hours });
}

export type { Locale, MessageKey, Vars } from "./types";
