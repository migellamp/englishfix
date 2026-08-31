import type { TranslationLanguage } from "../types";

export type TranslationLanguageOption = {
  id: TranslationLanguage;
  label: string;
  promptName: string;
  flag: string;
};

export const TRANSLATION_LANGUAGES: TranslationLanguageOption[] = [
  { id: "id", label: "Bahasa Indonesia", promptName: "Indonesian", flag: "id" },
  { id: "ms", label: "Bahasa Melayu", promptName: "Malay", flag: "my" },
  { id: "th", label: "ไทย", promptName: "Thai", flag: "th" },
  { id: "vi", label: "Tiếng Việt", promptName: "Vietnamese", flag: "vn" },
  { id: "zh-CN", label: "中文（简体）", promptName: "Simplified Chinese", flag: "cn" },
  { id: "ja", label: "日本語", promptName: "Japanese", flag: "jp" },
  { id: "ko", label: "한국어", promptName: "Korean", flag: "kr" },
  { id: "es", label: "Español", promptName: "Spanish", flag: "es" },
  { id: "fr", label: "Français", promptName: "French", flag: "fr" },
  { id: "de", label: "Deutsch", promptName: "German", flag: "de" },
  { id: "pt", label: "Português", promptName: "Portuguese", flag: "pt" },
  { id: "ar", label: "العربية", promptName: "Arabic", flag: "sa" },
];

export function isTranslationLanguage(
  value: string | null | undefined,
): value is TranslationLanguage {
  return TRANSLATION_LANGUAGES.some((language) => language.id === value);
}

export function getTranslationLanguage(
  value: TranslationLanguage | null | undefined,
): TranslationLanguageOption {
  return TRANSLATION_LANGUAGES.find((language) => language.id === value)
    ?? TRANSLATION_LANGUAGES[0];
}
