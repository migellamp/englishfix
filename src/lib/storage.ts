import type { AnalysisMode, AnalysisResult, ConnectionSession, HistoryItem, ThemeMode, TranslationLanguage } from "../types";
import { isAnalysisMode } from "./modes";
import { isTranslationLanguage } from "./languages";

const HISTORY_KEY = "englishfix.history.v2";
const SESSION_KEY = "englishfix.connection.v3";
const MODE_KEY = "englishfix.analysis-mode.v1";
const LANGUAGE_KEY = "englishfix.translation-language.v1";
const THEME_KEY = "englishfix.theme.v1";

function readJson<T>(storage: Storage, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readSession(): ConnectionSession | null {
  return readJson<ConnectionSession | null>(localStorage, SESSION_KEY, null);
}

export function saveSession(session: ConnectionSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function readAnalysisMode(): AnalysisMode {
  const value = localStorage.getItem(MODE_KEY);
  return isAnalysisMode(value) ? value : "fix";
}

export function saveAnalysisMode(mode: AnalysisMode): void {
  localStorage.setItem(MODE_KEY, mode);
}

export function readTranslationLanguage(): TranslationLanguage {
  const value = localStorage.getItem(LANGUAGE_KEY);
  return isTranslationLanguage(value) ? value : "id";
}

export function saveTranslationLanguage(language: TranslationLanguage): void {
  localStorage.setItem(LANGUAGE_KEY, language);
}

export function readThemeMode(): ThemeMode {
  const value = localStorage.getItem(THEME_KEY);
  if (value === "light" || value === "dark") return value;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

export function saveThemeMode(theme: ThemeMode): void {
  localStorage.setItem(THEME_KEY, theme);
}

export function readHistory(): HistoryItem[] {
  return readJson<HistoryItem[]>(localStorage, HISTORY_KEY, []);
}

export function saveHistory(history: HistoryItem[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

export function addHistory(input: string, result: AnalysisResult): void {
  const entry: HistoryItem = { id: Date.now(), input, result };
  saveHistory([entry, ...readHistory()]);
}
