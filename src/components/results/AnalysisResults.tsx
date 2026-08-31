import type { AnalysisResult, Suggestion, TokenResult } from "../../types";
import { Icon } from "../ui/Icon";

export type PopoverState =
  | { type: "word"; sentenceIndex: number; tokenIndex: number }
  | { type: "sentence"; sentenceIndex: number }
  | null;

type AnalysisResultsProps = {
  result: AnalysisResult;
  errorCount: number;
  modeShortLabel: string;
  languageLabel: string;
  popover: PopoverState;
  onPopoverChange: (value: PopoverState) => void;
  onApplySuggestion: (sentenceIndex: number, tokenIndex: number, suggestion: Suggestion) => void;
  onApplyAll: () => void;
  onClear: () => void;
};

export function AnalysisResults({
  result,
  errorCount,
  modeShortLabel,
  languageLabel,
  popover,
  onPopoverChange,
  onApplySuggestion,
  onApplyAll,
  onClear,
}: AnalysisResultsProps) {
  return (
    <section className="results-section" aria-labelledby="results-title">
      <div className="results-heading">
        <div>
          <p className="card-kicker">02 / {modeShortLabel}</p>
          <h2 id="results-title">Here’s what I noticed...</h2>
        </div>
        <span className="result-count">
          {errorCount === 0 ? "Looks good" : `${errorCount} gentle ${errorCount === 1 ? "fix" : "fixes"}`}
        </span>
      </div>

      <div className="analysis-layout">
        <div className="analysis-card annotated-card">
          <div className="analysis-card-header">
            <div><span className="mini-icon">Aa</span><span>Original draft</span></div>
            <span className="legend"><i /> Select a word or sentence</span>
          </div>
          <AnnotatedText
            result={result}
            popover={popover}
            onPopoverChange={onPopoverChange}
            onApplySuggestion={onApplySuggestion}
          />
        </div>

        <div className="analysis-card corrected-card">
          <div className="analysis-card-header">
            <div><span className="mini-icon mini-icon-accent">✓</span><span>Improved version</span></div>
            <span className="good-label">Ready to copy</span>
          </div>
          <p className="corrected-text">{result.correctedText}</p>
          <div className="corrected-actions">
            <button className="button button-dark small-button" type="button" onClick={onApplyAll} disabled={errorCount === 0}>
              Apply all fixes <Icon>→</Icon>
            </button>
            <button
              className="button button-quiet small-button"
              type="button"
              onClick={() => void navigator.clipboard?.writeText(result.correctedText)}
            >
              Copy text
            </button>
          </div>
        </div>
      </div>

      <div className="translation-card">
        <div className="translation-heading">
          <div><span className="mini-icon mini-icon-purple">◎</span><span>Meaning in context</span></div>
          <span>{languageLabel} translation</span>
        </div>
        <div className="translation-list">
          {result.sentences.map((sentence, index) => (
            <div className="translation-row" key={`${sentence.original}-${index}`}>
              <span className="translation-number">{String(index + 1).padStart(2, "0")}</span>
              <p className="translation-original">{sentence.corrected}</p>
              <p className="translation-id">{sentence.translationId}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="result-footer">
        <span><span className="footer-spark">✦</span> Select highlighted words to see the reason.</span>
        <button className="button button-quiet" type="button" onClick={onClear}>Clear result</button>
      </div>
    </section>
  );
}

type AnnotatedTextProps = {
  result: AnalysisResult;
  popover: PopoverState;
  onPopoverChange: (value: PopoverState) => void;
  onApplySuggestion: (sentenceIndex: number, tokenIndex: number, suggestion: Suggestion) => void;
};

function AnnotatedText({
  result,
  popover,
  onPopoverChange,
  onApplySuggestion,
}: AnnotatedTextProps) {
  return (
    <div className="annotated-text" onMouseLeave={() => onPopoverChange(null)}>
      {result.sentences.map((sentence, sentenceIndex) => (
        <span
          className="sentence-block"
          key={`${sentence.original}-${sentenceIndex}`}
          onMouseEnter={() => onPopoverChange({ type: "sentence", sentenceIndex })}
          onFocus={() => onPopoverChange({ type: "sentence", sentenceIndex })}
          tabIndex={0}
          role="button"
          aria-label={`View translation for sentence ${sentenceIndex + 1}`}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onPopoverChange({ type: "sentence", sentenceIndex });
            }
          }}
        >
          {sentence.tokens.map((token, tokenIndex) => (
            <Token
              key={`${token.text}-${tokenIndex}`}
              token={token}
              sentenceIndex={sentenceIndex}
              tokenIndex={tokenIndex}
              isOpen={popover?.type === "word" && popover.sentenceIndex === sentenceIndex && popover.tokenIndex === tokenIndex}
              onOpen={() => onPopoverChange({ type: "word", sentenceIndex, tokenIndex })}
              onClose={() => onPopoverChange(null)}
              onApplySuggestion={onApplySuggestion}
            />
          ))}
          {popover?.type === "sentence" && popover.sentenceIndex === sentenceIndex && (
            <span className="sentence-popover" role="status">
              <span className="popover-label">Sentence meaning</span>
              <strong>{sentence.translationId}</strong>
            </span>
          )}
          <span className="sentence-space"> </span>
        </span>
      ))}
    </div>
  );
}

type TokenProps = {
  token: TokenResult;
  sentenceIndex: number;
  tokenIndex: number;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onApplySuggestion: (sentenceIndex: number, tokenIndex: number, suggestion: Suggestion) => void;
};

function Token({
  token,
  sentenceIndex,
  tokenIndex,
  isOpen,
  onOpen,
  onClose,
  onApplySuggestion,
}: TokenProps) {
  const className = `token ${token.status === "error" ? "token-error" : "token-correct"}`;
  const content = token.status === "error" ? (
    <button className={className} type="button" onClick={onOpen} onFocus={onOpen} onMouseEnter={onOpen} aria-label={`${token.text}, view suggestions`}>
      {token.text}
    </button>
  ) : (
    <span className={className} onMouseEnter={onOpen}>{token.text}</span>
  );

  return (
    <span className="token-wrap" onMouseLeave={onClose}>
      {content}
      {isOpen && token.status === "error" && (
        <span className="word-popover" role="dialog" aria-label={`Suggestions for ${token.text}`} onMouseEnter={onOpen}>
          <span className="popover-label">Gentle suggestion</span>
          <span className="suggestion-list">
            {token.suggestions?.map((suggestion) => (
              <button
                type="button"
                className="suggestion-button"
                key={suggestion.replacement}
                onClick={() => onApplySuggestion(sentenceIndex, tokenIndex, suggestion)}
              >
                <strong>{suggestion.replacement}</strong><span>Apply</span>
              </button>
            ))}
          </span>
          <span className="popover-reason">{token.suggestions?.[0]?.reason}</span>
          <span className="popover-translation"><span>Meaning</span>{token.translationId ?? "No translation provided."}</span>
        </span>
      )}
    </span>
  );
}
