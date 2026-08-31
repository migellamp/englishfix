import type { AnalysisMode, AnalysisResult, ConnectionSession, SentenceResult, TokenResult, TranslationLanguage } from "../types";
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

function analysisSystemPrompt(targetLanguage: string): string {
  return `You are a kind, precise English writing coach. Return only valid JSON, with no markdown or commentary, using this exact shape:
{
  "originalText": "the input text",
  "correctedText": "the complete corrected text",
  "sentences": [
    {
      "original": "original sentence",
      "corrected": "corrected sentence",
      "translationId": "natural ${targetLanguage} translation",
      "tokens": [
        {
          "text": "the exact original token, including attached punctuation",
          "status": "correct or error",
          "translationId": "optional ${targetLanguage} meaning",
          "suggestions": [
            { "replacement": "replacement", "reason": "short explanation", "category": "spelling, grammar, or naturalness" }
          ]
        }
      ]
    }
  ]
}
Preserve the writer's voice. Mark only meaningful spelling, grammar, or naturalness issues. Keep every original token exactly in sentence.tokens[].text so the inline editor can render it. For every error, provide at least one concise suggestion. If the draft is already correct, return no errors and keep it unchanged. Return a natural ${targetLanguage} translation for every sentence and every flagged token.`;
}

const modeInstructions: Record<AnalysisMode, string> = {
  fix: `Analysis mode: Fix grammar & vocabulary.
Focus on objective spelling, grammar, word-choice, and clarity mistakes. Keep correct and natural sentences unchanged. Do not upgrade vocabulary just to sound more advanced. Preserve the writer's original voice, sentence structure, and level of formality. Token suggestions should be concise single-token replacements whenever possible.`,
  natural: `Analysis mode: Natural rephrase.
Make the writing sound fluent and commonly used by a natural English speaker. Improve awkward, uncommon, overly literal, or stilted phrasing even when it is grammatically correct. Preserve the exact meaning, facts, intent, and approximate tone; do not add information. Keep sentence boundaries aligned with the input when possible. Use the correctedText and sentence.corrected fields for the full natural rewrite. Mark only meaningful changes in the original tokens and keep token suggestions concise; do not flag every stylistic preference.`,
  ielts: `Analysis mode: IELTS high band.
Rewrite the draft as precise, formal, high-level English suitable for IELTS writing around Band 8 or 9. Improve lexical resource, grammatical range and accuracy, cohesion, and academic phrasing. Use advanced vocabulary only when it is precise, natural, and appropriate; avoid obscure thesaurus words. Preserve all facts, numbers, names, and the writer's intended meaning. Keep sentence boundaries aligned with the input when possible. Use the correctedText and sentence.corrected fields for the full improved version, and mark only meaningful improvements in the original tokens.`,
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

export async function verifyProviderConnection(
  connection: ConnectionVerification,
): Promise<{ modelId: string; availableModels: string[] }> {
  const response = await providerFetch(providerUrl(connection.baseUrl, "models"), {
    headers: { Authorization: `Bearer ${connection.apiKey}` },
  });
  const payload = await readJson<ProviderModelsPayload>(response);
  if (!response.ok) throw providerError(payload, `The provider returned HTTP ${response.status} while listing models.`);

  const availableModels = payload?.data
    ?.map((model) => model.id?.trim())
    .filter((id): id is string => Boolean(id)) ?? [];
  const requestedModel = connection.modelId?.trim() ?? "";
  const modelId = availableModels.includes(requestedModel) ? requestedModel : availableModels[0] || requestedModel;
  if (!modelId) throw new Error("The provider did not return any model ids. Enter a model name manually.");
  return { modelId, availableModels };
}

function contentText(content: ChatMessageContent | undefined): string {
  if (typeof content === "string") return content;
  return content?.map((part) => part.text || part.content || "").join("") ?? "";
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
  if (typeof parsed.correctedText !== "string" || !Array.isArray(parsed.sentences)) {
    throw new Error("The provider returned an incomplete analysis.");
  }

  const sentences: SentenceResult[] = parsed.sentences.map((sentence) => {
    const value = sentence as { original?: unknown; corrected?: unknown; translationId?: unknown; tokens?: unknown };
    const tokens: TokenResult[] = Array.isArray(value.tokens)
      ? value.tokens.map((token) => {
        const item = token as { text?: unknown; status?: unknown; translationId?: unknown; suggestions?: unknown };
        return {
          text: String(item.text ?? ""),
          status: item.status === "error" ? "error" : "correct",
          ...(typeof item.translationId === "string" ? { translationId: item.translationId } : {}),
          ...(Array.isArray(item.suggestions) ? { suggestions: item.suggestions } : {}),
        };
      })
      : [];
    return {
      original: String(value.original ?? ""),
      corrected: String(value.corrected ?? ""),
      translationId: String(value.translationId ?? ""),
      tokens,
    };
  });

  return {
    originalText,
    correctedText: parsed.correctedText,
    sentences,
    createdAt: Date.now(),
  };
}

function supportsJsonMode(payload: ChatCompletionPayload | null): boolean {
  const message = providerError(payload, "").message.toLowerCase();
  return message.includes("response_format") || message.includes("json_object") || message.includes("structured output");
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

  const body = {
    model: session.modelId,
    temperature: 0,
    messages: [
      { role: "system", content: promptForMode(mode, translationLanguage) },
      { role: "user", content: JSON.stringify({ text, sourceLanguage: "en", targetLanguage: translationLanguage, analysisMode: mode }) },
    ],
    response_format: { type: "json_object" },
  };
  let response = await providerFetch(providerUrl(session.baseUrl, "chat/completions"), {
    method: "POST",
    headers: providerHeaders(session.apiKey),
    body: JSON.stringify(body),
  });
  let payload = await readJson<ChatCompletionPayload>(response);

  if (!response.ok && response.status === 400 && supportsJsonMode(payload)) {
    const { response_format: _responseFormat, ...fallbackBody } = body;
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
