import type {
  AnalysisMode,
  AnalysisResult,
  ConnectionSession,
  SentenceResult,
  Suggestion,
  SuggestionCategory,
  TokenResult,
  TranslationLanguage,
} from "../types";
import { getTranslationLanguage } from "./languages";

type ProviderModel = { id?: string };

type ProviderModelsPayload = {
  data?: ProviderModel[];
  error?: { message?: string } | string;
};

type ChatCompletionPayload = {
  choices?: Array<{
    message?: { content?: string | Array<{ text?: string; content?: string }> };
  }>;
  error?: { message?: string } | string;
};

type ChatMessageContent = string | Array<{ text?: string; content?: string }>;

type ConnectionVerification = {
  baseUrl: string;
  apiKey: string;
  modelId?: string;
};

type SourceSentence = {
  index: number;
  text: string;
  tokens: string[];
};

type CompactIssue = {
  tokenIndex?: unknown;
  replacement?: unknown;
  reason?: unknown;
  category?: unknown;
  translation?: unknown;
  translationId?: unknown;
};

type CompactSentence = {
  index?: unknown;
  corrected?: unknown;
  translation?: unknown;
  translationId?: unknown;
  issues?: unknown;
  tokens?: unknown;
  original?: unknown;
};

function analysisSystemPrompt(targetLanguage: string): string {
  return `You are a kind, precise English writing coach. Return only valid JSON without markdown, using this compact shape:
{
  "correctedText": "complete corrected text",
  "sentences": [
    {
      "index": 0,
      "corrected": "complete corrected sentence",
      "translation": "natural ${targetLanguage} translation",
      "issues": [
        {
          "tokenIndex": 2,
          "replacement": "replacement",
          "reason": "short explanation",
          "category": "spelling, grammar, or naturalness",
          "translation": "optional ${targetLanguage} meaning"
        }
      ]
    }
  ]
}
The user supplies pre-tokenized sentences. Sentence and token indices are zero-based. Include every sentence exactly once and only list tokens that have meaningful issues. Do not repeat original sentences, original tokens, correct tokens, status fields, or empty issues. The client reconstructs those locally. Give at most one best concise replacement per issue and keep it to one token when possible. If the text is correct, keep it unchanged and return an empty issues array. Preserve the writer's voice and return a natural ${targetLanguage} translation for every sentence.`;
}

const modeInstructions: Record<AnalysisMode, string> = {
  fix: `Analysis mode: Fix grammar & vocabulary.
Focus on objective spelling, grammar, word-choice, and clarity mistakes. Keep correct and natural sentences unchanged. Do not upgrade vocabulary just to sound more advanced. Preserve the writer's original voice, sentence structure, and level of formality.`,
  natural: `Analysis mode: Natural rephrase.
Make the writing sound fluent and commonly used by a natural English speaker. Improve awkward, uncommon, overly literal, or stilted phrasing even when it is grammatically correct. Preserve the exact meaning, facts, intent, and approximate tone; do not add information. Keep sentence boundaries aligned with the input when possible.`,
  ielts: `Analysis mode: IELTS high band.
Rewrite the draft as precise, formal, high-level English suitable for IELTS writing around Band 8 or 9. Improve lexical resource, grammatical range and accuracy, cohesion, and academic phrasing. Use advanced vocabulary only when it is precise, natural, and appropriate. Preserve all facts, numbers, names, and intended meaning.`,
};

function promptForMode(mode: AnalysisMode, translationLanguage: TranslationLanguage): string {
  const language = getTranslationLanguage(translationLanguage);
  return `${analysisSystemPrompt(language.promptName)}\n\nTarget translation language: ${language.promptName} (${language.id}).\n\n${modeInstructions[mode]}`;
}

function providerUrl(baseUrl: string, resource: string): string {
  return `${baseUrl.trim().replace(/\/+$/, "")}/${resource}`;
}

async function readJson<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null;
}

function providerError(payload: { error?: { message?: string } | string } | null, fallback: string): Error {
  const error = payload?.error;
  const message = typeof error === "string" ? error : error?.message;
  return new Error(message || fallback);
}

function providerHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function providerFetch(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error("Unable to reach the provider from this browser. Check the URL, HTTPS, and CORS settings.");
  }
}

const NON_TEXT_MODEL = /(embedding|moderation|whisper|transcri|tts|audio|image|dall-e|realtime|search|computer-use)/i;
const FAST_MODEL = /(nano|mini|flash|haiku|small|fast|lite)/i;
const SLOW_MODEL = /(pro|opus|large|max|reasoning)/i;

function analysisModelRank(modelId: string): number {
  if (NON_TEXT_MODEL.test(modelId)) return 1_000;
  if (/gpt-5(?:\.\d+)?-nano/i.test(modelId)) return 0;
  if (/gpt-5(?:\.\d+)?-mini/i.test(modelId)) return 1;
  if (/gpt-4\.1-nano/i.test(modelId)) return 2;
  if (/gpt-4\.1-mini|gpt-4o-mini/i.test(modelId)) return 3;
  if (FAST_MODEL.test(modelId)) return 10;
  if (SLOW_MODEL.test(modelId)) return 80;
  return 40;
}

function sortModelsForAnalysis(models: string[]): string[] {
  return models
    .map((model, index) => ({ model, index, rank: analysisModelRank(model) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ model }) => model);
}

export async function verifyProviderConnection(
  connection: ConnectionVerification,
): Promise<{ modelId: string; availableModels: string[] }> {
  const response = await providerFetch(providerUrl(connection.baseUrl, "models"), {
    headers: { Authorization: `Bearer ${connection.apiKey}` },
  });
  const payload = await readJson<ProviderModelsPayload>(response);
  if (!response.ok) throw providerError(payload, `The provider returned HTTP ${response.status} while listing models.`);

  const availableModels = sortModelsForAnalysis(payload?.data
    ?.map((model) => model.id?.trim())
    .filter((id): id is string => Boolean(id)) ?? []);
  const requestedModel = connection.modelId?.trim() ?? "";
  const modelId = availableModels.includes(requestedModel) ? requestedModel : availableModels[0] || requestedModel;
  if (!modelId) throw new Error("The provider did not return any model ids. Enter a model name manually.");
  return { modelId, availableModels };
}

function contentText(content: ChatMessageContent | undefined): string {
  if (typeof content === "string") return content;
  return content?.map((part) => part.text || part.content || "").join("") ?? "";
}

function sourceSentences(text: string): SourceSentence[] {
  const parts = text.match(/[^.!?]+[.!?]*/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
  const sentences = parts.length > 0 ? parts : [text];
  return sentences.map((sentence, index) => ({
    index,
    text: sentence,
    tokens: sentence.match(/\S+/g) ?? [],
  }));
}

function suggestionCategory(value: unknown): SuggestionCategory {
  return value === "spelling" || value === "naturalness" ? value : "grammar";
}

function compactTokens(source: SourceSentence, rawIssues: unknown): TokenResult[] {
  const tokens: TokenResult[] = source.tokens.map((text) => ({ text, status: "correct" }));
  if (!Array.isArray(rawIssues)) return tokens;

  for (const rawIssue of rawIssues) {
    const issue = rawIssue as CompactIssue;
    const tokenIndex = Number(issue.tokenIndex);
    const replacement = typeof issue.replacement === "string" ? issue.replacement.trim() : "";
    if (!Number.isInteger(tokenIndex) || tokenIndex < 0 || tokenIndex >= tokens.length || !replacement) continue;

    const suggestion: Suggestion = {
      replacement,
      reason: typeof issue.reason === "string" && issue.reason.trim()
        ? issue.reason.trim()
        : "This change makes the sentence more accurate and natural.",
      category: suggestionCategory(issue.category),
    };
    const translation = typeof issue.translation === "string"
      ? issue.translation
      : typeof issue.translationId === "string" ? issue.translationId : undefined;
    tokens[tokenIndex] = {
      ...tokens[tokenIndex],
      status: "error",
      suggestions: [suggestion],
      ...(translation ? { translationId: translation } : {}),
    };
  }
  return tokens;
}

function legacySentence(value: CompactSentence): SentenceResult {
  const tokens: TokenResult[] = Array.isArray(value.tokens)
    ? value.tokens.map((token) => {
      const item = token as { text?: unknown; status?: unknown; translationId?: unknown; suggestions?: unknown };
      return {
        text: String(item.text ?? ""),
        status: item.status === "error" ? "error" : "correct",
        ...(typeof item.translationId === "string" ? { translationId: item.translationId } : {}),
        ...(Array.isArray(item.suggestions) ? { suggestions: item.suggestions as Suggestion[] } : {}),
      };
    })
    : [];
  return {
    original: String(value.original ?? ""),
    corrected: String(value.corrected ?? value.original ?? ""),
    translationId: String(value.translationId ?? value.translation ?? ""),
    tokens,
  };
}

function parseAnalysis(content: string, originalText: string): AnalysisResult {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = (fenced || content).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The provider returned no structured analysis.");

  const parsed = JSON.parse(candidate.slice(start, end + 1)) as {
    correctedText?: unknown;
    sentences?: unknown;
  };
  if (!Array.isArray(parsed.sentences)) throw new Error("The provider returned an incomplete analysis.");

  const rawSentences = parsed.sentences as CompactSentence[];
  const usesLegacyShape = rawSentences.some((sentence) => Array.isArray(sentence.tokens));
  const sentences: SentenceResult[] = usesLegacyShape
    ? rawSentences.map(legacySentence)
    : sourceSentences(originalText).map((source) => {
      const value = rawSentences.find((sentence) => Number(sentence.index) === source.index)
        ?? rawSentences[source.index];
      const translation = value && typeof value.translation === "string"
        ? value.translation
        : value && typeof value.translationId === "string" ? value.translationId : "";
      return {
        original: source.text,
        corrected: value && typeof value.corrected === "string" ? value.corrected : source.text,
        translationId: translation,
        tokens: compactTokens(source, value?.issues),
      };
    });
  const correctedText = typeof parsed.correctedText === "string"
    ? parsed.correctedText
    : sentences.map((sentence) => sentence.corrected).join(" ");

  return { originalText, correctedText, sentences, createdAt: Date.now() };
}

function unsupportedOptionalParameter(payload: ChatCompletionPayload | null): boolean {
  const message = providerError(payload, "").message.toLowerCase();
  return message.includes("response_format")
    || message.includes("json_object")
    || message.includes("structured output")
    || message.includes("reasoning_effort");
}

function requestSentences(text: string): Array<{ index: number; tokens: string[] }> {
  return sourceSentences(text).map(({ index, tokens }) => ({ index, tokens }));
}

export async function analyzeWithProvider(
  text: string,
  session: ConnectionSession,
  mode: AnalysisMode = "fix",
  translationLanguage: TranslationLanguage = "id",
): Promise<AnalysisResult> {
  if (!session.modelId || !session.baseUrl || !session.apiKey) {
    throw new Error("The BYOK connection is incomplete.");
  }

  const usesReasoningModel = /^(?:gpt-5|o[134](?:-|$))/i.test(session.modelId);
  const body = {
    model: session.modelId,
    temperature: 0,
    messages: [
      { role: "system", content: promptForMode(mode, translationLanguage) },
      {
        role: "user",
        content: JSON.stringify({
          sourceLanguage: "en",
          targetLanguage: translationLanguage,
          analysisMode: mode,
          sentences: requestSentences(text),
        }),
      },
    ],
    response_format: { type: "json_object" },
    ...(usesReasoningModel ? { reasoning_effort: "low" } : {}),
  };
  let response = await providerFetch(providerUrl(session.baseUrl, "chat/completions"), {
    method: "POST",
    headers: providerHeaders(session.apiKey),
    body: JSON.stringify(body),
  });
  let payload = await readJson<ChatCompletionPayload>(response);

  if (!response.ok && response.status === 400 && unsupportedOptionalParameter(payload)) {
    const {
      response_format: _responseFormat,
      reasoning_effort: _reasoningEffort,
      ...fallbackBody
    } = body as typeof body & { reasoning_effort?: string };
    response = await providerFetch(providerUrl(session.baseUrl, "chat/completions"), {
      method: "POST",
      headers: providerHeaders(session.apiKey),
      body: JSON.stringify(fallbackBody),
    });
    payload = await readJson<ChatCompletionPayload>(response);
  }

  if (!response.ok) throw providerError(payload, `The provider returned HTTP ${response.status} while analyzing the draft.`);
  const content = contentText(payload?.choices?.[0]?.message?.content);
  if (!content) throw new Error("The provider returned an empty analysis.");
  return { ...parseAnalysis(content, text), mode, translationLanguage };
}
