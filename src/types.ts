export type TokenStatus = "correct" | "error";

export type SuggestionCategory = "spelling" | "grammar" | "naturalness";

export type AnalysisMode = "fix" | "natural" | "ielts";

export type TranslationLanguage =
  | "id"
  | "ms"
  | "th"
  | "vi"
  | "zh-CN"
  | "ja"
  | "ko"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ar";

export type ThemeMode = "light" | "dark";

export type Suggestion = {
  replacement: string;
  reason: string;
  category: SuggestionCategory;
};

export type TokenResult = {
  text: string;
  status: TokenStatus;
  translationId?: string;
  suggestions?: Suggestion[];
};

export type SentenceResult = {
  original: string;
  corrected: string;
  translationId: string;
  tokens: TokenResult[];
};

export type AnalysisResult = {
  originalText: string;
  correctedText: string;
  sentences: SentenceResult[];
  createdAt: number;
  mode?: AnalysisMode;
  translationLanguage?: TranslationLanguage;
};

export type HistoryItem = {
  id: number;
  input: string;
  result: AnalysisResult;
};

export type ConnectionSession = {
  provider: "byok";
  baseUrl: string;
  apiKey: string;
  modelId: string;
  availableModels?: string[];
  connectedAt: number;
};

export type Analyzer = {
  analyze: (text: string) => Promise<AnalysisResult>;
};
