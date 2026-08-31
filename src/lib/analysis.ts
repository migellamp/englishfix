import type { AnalysisResult, TokenResult } from "../types";

function cleanWord(value: string): string {
  return value.replace(/^[^a-z']+|[^a-z']+$/gi, "");
}

function preserveCase(source: string, replacement: string): string {
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  if (/^[A-Z]/.test(source)) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function replaceToken(token: string, replacement: string): string {
  const leading = token.match(/^[^a-z']*/i)?.[0] ?? "";
  const trailing = token.match(/[^a-z']*$/i)?.[0] ?? "";
  const core = cleanWord(token);
  return `${leading}${preserveCase(core || token, replacement)}${trailing}`;
}

function joinTokens(tokens: TokenResult[]): string {
  return tokens.reduce((text, token) => {
    if (!text) return token.text;
    if (/^[,.;!?%)\]}:]/.test(token.text)) return `${text}${token.text}`;
    return `${text} ${token.text}`;
  }, "");
}

export function rebuildResult(result: AnalysisResult): AnalysisResult {
  const sentences = result.sentences.map((sentence) => ({
    ...sentence,
    corrected: joinTokens(sentence.tokens),
  }));

  return {
    ...result,
    sentences,
    correctedText: sentences.map((sentence) => sentence.corrected).join(" "),
  };
}
