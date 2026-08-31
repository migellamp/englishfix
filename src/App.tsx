import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { rebuildResult, replaceToken } from "./lib/analysis";
import {
  analyzeWithProvider,
  verifyProviderConnection,
} from "./lib/llmClient";
import {
  addHistory,
  clearSession,
  readHistory,
  readAnalysisMode,
  readTranslationLanguage,
  readThemeMode,
  readSession,
  saveAnalysisMode,
  saveTranslationLanguage,
  saveThemeMode,
  saveSession,
  saveHistory,
} from "./lib/storage";
import { ANALYSIS_MODES, getAnalysisMode, isAnalysisMode } from "./lib/modes";
import {
  getTranslationLanguage,
  isTranslationLanguage,
  TRANSLATION_LANGUAGES,
} from "./lib/languages";
import type {
  AnalysisMode,
  AnalysisResult,
  ConnectionSession,
  HistoryItem,
  Suggestion,
  TokenResult,
  ThemeMode,
  TranslationLanguage,
} from "./types";

type PopoverState =
  | { type: "word"; sentenceIndex: number; tokenIndex: number }
  | { type: "sentence"; sentenceIndex: number }
  | null;

type ToastTone = "success" | "error" | "info";
type Toast = { message: string; tone: ToastTone } | null;

function Icon({ children }: { children: ReactNode }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

type CustomSelectOption = {
  value: string;
  label: string;
  description?: string;
  flag?: string;
};

function CountryFlag({ code, label }: { code: string; label: string }) {
  return (
    <img
      className="country-flag"
      src={`https://flagcdn.com/24x18/${code}.png`}
      srcSet={`https://flagcdn.com/48x36/${code}.png 2x`}
      width="24"
      height="18"
      alt={`${label} flag`}
      loading="lazy"
    />
  );
}

function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
}: {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`custom-select ${isOpen ? "is-open" : ""}`} ref={rootRef}>
      <button
        ref={triggerRef}
        className="custom-select-trigger"
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <span className="custom-select-value">
          {selected?.flag && <CountryFlag code={selected.flag} label={selected.label} />}
          <span className="custom-select-value-label">{selected?.label ?? "Choose"}</span>
        </span>
        <span className="custom-select-chevron" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              className={`custom-select-option ${option.value === value ? "is-selected" : ""}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              onClick={() => choose(option.value)}
            >
              <span className="custom-select-option-content">
                {option.flag && <CountryFlag code={option.flag} label={option.label} />}
                <span>
                <span className="custom-select-option-label">{option.label}</span>
                {option.description && <span className="custom-select-option-description">{option.description}</span>}
                </span>
              </span>
              <span className={`custom-select-indicator ${option.value === value ? "is-selected" : ""}`} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [popover, setPopover] = useState<PopoverState>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [session, setSession] = useState<ConnectionSession | null>(() => readSession());
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(() => readAnalysisMode());
  const [translationLanguage, setTranslationLanguage] = useState<TranslationLanguage>(
    () => readTranslationLanguage(),
  );
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readThemeMode());
  const [isConnectionOpen, setIsConnectionOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHistoryPreview, setIsHistoryPreview] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => readHistory());
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setPopover(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const errorCount = useMemo(
    () =>
      result?.sentences.reduce(
        (total, sentence) =>
          total + sentence.tokens.filter((token) => token.status === "error").length,
        0,
      ) ?? 0,
    [result],
  );

  const showToast = (message: string, tone: ToastTone = "info") => {
    setToast({ message, tone });
  };

  const analyze = async () => {
    if (!input.trim()) {
      showToast("Write or paste some English before analyzing it.", "error");
      return;
    }
    if (!session) {
      setIsConnectionOpen(true);
      showToast("Connect an LLM before analyzing your draft.", "info");
      return;
    }

    setIsHistoryPreview(false);
    setPopover(null);
    setIsAnalyzing(true);
    try {
      const nextResult = await analyzeWithProvider(
        input.trim(),
        session,
        analysisMode,
        translationLanguage,
      );
      setResult(nextResult);
      addHistory(input.trim(), nextResult);
      const nextHistory = readHistory();
      setHistory(nextHistory);
      setActiveHistoryId(nextHistory[0]?.id ?? null);
      showToast("Analysis complete.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Analysis failed. Please try again.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void analyze();
    }
  };

  const applySuggestion = (
    sentenceIndex: number,
    tokenIndex: number,
    suggestion: Suggestion,
  ) => {
    if (!result) return;
    const nextResult: AnalysisResult = structuredClone(result);
    const token = nextResult.sentences[sentenceIndex]?.tokens[tokenIndex];
    if (!token) return;
    token.text = replaceToken(token.text, suggestion.replacement);
    token.status = "correct";
    token.suggestions = undefined;
    const rebuilt = rebuildResult(nextResult);
    setResult(rebuilt);
    setPopover(null);
    updateLatestHistory(rebuilt);
    showToast(`Applied “${suggestion.replacement}”.`, "success");
  };

  const applyAll = () => {
    if (!result) return;
    const nextResult: AnalysisResult = structuredClone(result);
    nextResult.sentences.forEach((sentence) => {
      sentence.tokens.forEach((token) => {
        const suggestion = token.suggestions?.[0];
        if (!suggestion) return;
        token.text = replaceToken(token.text, suggestion.replacement);
        token.status = "correct";
        token.suggestions = undefined;
      });
    });
    const rebuilt = rebuildResult(nextResult);
    setResult(rebuilt);
    setPopover(null);
    updateLatestHistory(rebuilt);
    showToast("All suggested fixes were applied.", "success");
  };

  const updateLatestHistory = (updatedResult: AnalysisResult) => {
    const nextHistory = readHistory();
    const historyIndex = activeHistoryId === null
      ? 0
      : nextHistory.findIndex((item) => item.id === activeHistoryId);
    if (historyIndex < 0 || !nextHistory[historyIndex]) return;
    nextHistory[historyIndex] = { ...nextHistory[historyIndex], result: updatedResult };
    saveHistory(nextHistory);
    setHistory(nextHistory);
  };

  const clearResult = () => {
    setResult(null);
    setPopover(null);
    setInput("");
    setActiveHistoryId(null);
    setIsHistoryPreview(false);
    showToast("Draft cleared.", "info");
  };

  const startNewChat = () => {
    setInput("");
    setResult(null);
    setPopover(null);
    setActiveHistoryId(null);
    setIsHistoryPreview(false);
    showToast("New chat started.", "info");
  };

  const openHistory = () => {
    setHistory(readHistory());
    setIsHistoryOpen(true);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setInput(item.input);
    setResult(item.result);
    setIsHistoryPreview(true);
    if (isAnalysisMode(item.result.mode)) {
      saveAnalysisMode(item.result.mode);
      setAnalysisMode(item.result.mode);
    }
    if (isTranslationLanguage(item.result.translationLanguage)) {
      saveTranslationLanguage(item.result.translationLanguage);
      setTranslationLanguage(item.result.translationLanguage);
    }
    setActiveHistoryId(item.id);
    setIsHistoryOpen(false);
    setPopover(null);
    showToast("Draft loaded from history.", "info");
  };

  const deleteHistoryItem = (id: number) => {
    const nextHistory = readHistory().filter((item) => item.id !== id);
    saveHistory(nextHistory);
    setHistory(nextHistory);
    if (activeHistoryId === id) setActiveHistoryId(null);
    showToast("History item deleted.", "info");
  };

  const clearAllHistory = () => {
    if (!window.confirm("Clear all locally saved history?")) return;
    saveHistory([]);
    setHistory([]);
    setActiveHistoryId(null);
    showToast("History cleared.", "success");
  };

  const handleConnected = (nextSession: ConnectionSession) => {
    saveSession(nextSession);
    setSession(nextSession);
    setIsConnectionOpen(false);
    showToast("BYOK model connected.", "success");
  };

  const changeModel = (modelId: string) => {
    if (!session) return;
    const nextSession = { ...session, modelId };
    saveSession(nextSession);
    setSession(nextSession);
  };

  const changeAnalysisMode = (mode: string) => {
    if (!isAnalysisMode(mode)) return;
    saveAnalysisMode(mode);
    setAnalysisMode(mode);
  };

  const changeTranslationLanguage = (language: string) => {
    if (!isTranslationLanguage(language)) return;
    saveTranslationLanguage(language);
    setTranslationLanguage(language);
  };

  const logout = () => {
    clearSession();
    setSession(null);
    showToast("LLM disconnected.", "info");
  };

  const activeMode = getAnalysisMode(analysisMode);
  const displayedMode = getAnalysisMode(result?.mode ?? (isHistoryPreview ? "fix" : analysisMode));
  const displayedLanguage = getTranslationLanguage(
    result?.translationLanguage ?? (result ? "id" : translationLanguage),
  );

  return (
    <div className={`app-shell theme-${themeMode} ${isHistoryPreview ? "history-preview" : result ? "results-view" : "initial-view"}`}>
      <header className="site-header">
        <a className="brand" href="/" aria-label="EnglishFix home">
          <img className="brand-mark" src="/assets/englishfix-logo.svg" alt="" aria-hidden="true" />
          <span className="brand-name">english<span>fix</span></span>
        </a>

        <div className="header-actions">
          <div className="header-language">
            <CustomSelect
              value={translationLanguage}
              options={TRANSLATION_LANGUAGES.map((language) => ({
                value: language.id,
                label: language.label,
                flag: language.flag,
              }))}
              onChange={changeTranslationLanguage}
              ariaLabel="Choose translation language"
              disabled={isAnalyzing}
            />
          </div>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => {
              const nextTheme: ThemeMode = themeMode === "dark" ? "light" : "dark";
              saveThemeMode(nextTheme);
              setThemeMode(nextTheme);
            }}
            aria-label={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
          >
            <span
              className={`theme-icon ${themeMode === "dark" ? "theme-icon-sun" : "theme-icon-moon"}`}
              aria-hidden="true"
            />
          </button>
          <span className={`mode-badge ${session ? "is-connected" : ""}`}>
            <span className="status-dot" aria-hidden="true" />
            {session ? `BYOK · ${session.modelId}` : "LLM not connected"}
          </span>
          <button className="button button-quiet" type="button" onClick={openHistory}>
            <Icon>↺</Icon><span>History</span>
          </button>
          {session ? (
            <button className="button button-outline" type="button" onClick={logout}>
              Disconnect
            </button>
          ) : (
            <button className="button button-dark" type="button" onClick={() => setIsConnectionOpen(true)}>
            Connect LLM <Icon>↗</Icon>
            </button>
          )}
        </div>
      </header>

      <main>
        {!isHistoryPreview && (
          <>
            <section className="hero" aria-labelledby="hero-title">
              <p className="eyebrow"><span className="eyebrow-line" /> English writing coach</p>
              <h1 id="hero-title">Make it sound <em>like you.</em></h1>
              <p className="hero-copy">
                Write naturally. EnglishFix will improve grammar, spelling, and fluency
                while keeping your voice intact.
              </p>
            </section>

            <section className="editor-card" aria-labelledby="editor-title">
              <div className="section-heading">
                <div>
                  <p className="card-kicker">01 / Your draft</p>
                  <h2 id="editor-title">Start with your words.</h2>
                </div>
                <span className="draft-label">History saved locally</span>
              </div>
              <label className="sr-only" htmlFor="draft-input">Write your English draft</label>
              <textarea
                id="draft-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onEditorKeyDown}
                placeholder="Write or paste your English draft here..."
                rows={5}
                disabled={isAnalyzing}
              />
              <div className="editor-footer">
                <span className="editor-hint"><kbd>Enter</kbd> to analyze <span>·</span> <kbd>Shift + Enter</kbd> for a new line</span>
                <div className="editor-actions">
                  <div className="analysis-picker" title={activeMode.description}>
                    <span>Mode</span>
                    <CustomSelect
                      value={analysisMode}
                      options={ANALYSIS_MODES.map((mode) => ({ value: mode.id, label: mode.label, description: mode.description }))}
                      onChange={changeAnalysisMode}
                      ariaLabel="Choose analysis mode"
                      disabled={isAnalyzing}
                    />
                  </div>
                  {session?.availableModels && session.availableModels.length > 0 && <div className="model-picker"><span>Model</span><CustomSelect value={session.modelId} options={session.availableModels.map((model) => ({ value: model, label: model }))} onChange={changeModel} ariaLabel="Choose model for this analysis" disabled={isAnalyzing} /></div>}
                  <button className="button button-accent" type="button" onClick={() => void analyze()} disabled={isAnalyzing}>
                    {isAnalyzing ? <><span className="spinner" /> Analyzing...</> : <>{activeMode.buttonLabel} <Icon>→</Icon></>}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {result ? (
          <section className="results-section" aria-labelledby="results-title">
            <div className="results-heading">
              <div>
                <p className="card-kicker">02 / {displayedMode.shortLabel}</p>
                <h2 id="results-title">Here’s what I noticed...</h2>
              </div>
              <div className="results-heading-actions">
                <span className="result-count">{errorCount === 0 ? "Looks good" : `${errorCount} gentle ${errorCount === 1 ? "fix" : "fixes"}`}</span>
                {isHistoryPreview && <button className="button button-dark new-chat-button" type="button" onClick={startNewChat}>New chat</button>}
              </div>
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
                  onPopoverChange={setPopover}
                  onApplySuggestion={applySuggestion}
                />
              </div>

              <div className="analysis-card corrected-card">
                <div className="analysis-card-header">
                  <div><span className="mini-icon mini-icon-accent">✓</span><span>Improved version</span></div>
                  <span className="good-label">Ready to copy</span>
                </div>
                <p className="corrected-text">{result.correctedText}</p>
                <div className="corrected-actions">
                  <button className="button button-dark small-button" type="button" onClick={applyAll} disabled={errorCount === 0}>
                    Apply all fixes <Icon>→</Icon>
                  </button>
                  <button className="button button-quiet small-button" type="button" onClick={() => void navigator.clipboard?.writeText(result.correctedText)}>
                    Copy text
                  </button>
                </div>
              </div>
            </div>

            <div className="translation-card">
              <div className="translation-heading">
                <div><span className="mini-icon mini-icon-purple">◎</span><span>Meaning in context</span></div>
                <span>{displayedLanguage.label} translation</span>
              </div>
              <div className="translation-list">
                {result.sentences.map((sentence, index) => (
                  <div className="translation-row" key={`${sentence.original}-${index}`}>
                    <span className="translation-number">0{index + 1}</span>
                    <p className="translation-original">{sentence.corrected}</p>
                    <p className="translation-id">{sentence.translationId}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="result-footer">
              <span><span className="footer-spark">✦</span> Select highlighted words to see the reason.</span>
              <button className="button button-quiet" type="button" onClick={clearResult}>Clear result</button>
            </div>
          </section>
        ) : !isHistoryPreview ? (
          <section className="empty-state" aria-label="How EnglishFix works">
            <div className="empty-step"><span>1</span><div><strong>Write naturally</strong><p>Do not worry about typos or grammar yet.</p></div></div>
            <div className="empty-divider" aria-hidden="true" />
            <div className="empty-step"><span>2</span><div><strong>Learn from each fix</strong><p>See explanations, word meanings, and context.</p></div></div>
            <div className="empty-divider" aria-hidden="true" />
            <div className="empty-step"><span>3</span><div><strong>Keep your voice</strong><p>Apply only the changes that feel right to you.</p></div></div>
          </section>
        ) : null}
      </main>

      <footer className="site-footer">
        <span>EnglishFix <span className="footer-dot">·</span> a kinder way to improve your English</span>
        <span className="footer-note">Your history stays in this browser.</span>
      </footer>

      {isConnectionOpen && <ConnectionModal onClose={() => setIsConnectionOpen(false)} onConnected={handleConnected} />}
      {isHistoryOpen && (
        <HistoryModal
          history={history}
          onClose={() => setIsHistoryOpen(false)}
          onLoad={loadHistoryItem}
          onDelete={deleteHistoryItem}
          onClear={clearAllHistory}
        />
      )}
      {toast && <div className={`toast toast-${toast.tone}`} role="status">{toast.message}</div>}
    </div>
  );
}

function AnnotatedText({
  result,
  popover,
  onPopoverChange,
  onApplySuggestion,
}: {
  result: AnalysisResult;
  popover: PopoverState;
  onPopoverChange: (value: PopoverState) => void;
  onApplySuggestion: (sentenceIndex: number, tokenIndex: number, suggestion: Suggestion) => void;
}) {
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

function Token({
  token,
  sentenceIndex,
  tokenIndex,
  isOpen,
  onOpen,
  onClose,
  onApplySuggestion,
}: {
  token: TokenResult;
  sentenceIndex: number;
  tokenIndex: number;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onApplySuggestion: (sentenceIndex: number, tokenIndex: number, suggestion: Suggestion) => void;
}) {
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

function ConnectionModal({
  onClose,
  onConnected,
}: {
  onClose: () => void;
  onConnected: (session: ConnectionSession) => void;
}) {
  const existingSession = readSession();
  const [baseUrl, setBaseUrl] = useState(existingSession?.baseUrl ?? "https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState(existingSession?.apiKey ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

  const verifyByok = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedUrl = normalizeBaseUrl(baseUrl);
    if (!normalizedUrl || !apiKey.trim()) {
      setError("Enter a base URL and API key before checking the connection.");
      return;
    }
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      setError("The base URL must start with http:// or https://.");
      return;
    }

    setIsBusy(true);
    setError("");
    try {
      const verification = await verifyProviderConnection({
        baseUrl: normalizedUrl,
        apiKey: apiKey.trim(),
        modelId: existingSession?.modelId,
      });
      const discoveredModels = verification.availableModels;
      const selectedModel = verification.modelId;
      onConnected({
        provider: "byok",
        baseUrl: normalizedUrl,
        apiKey: apiKey.trim(),
        modelId: selectedModel,
        availableModels: discoveredModels,
        connectedAt: Date.now(),
      });
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "Unable to verify the LLM connection.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal connection-modal" role="dialog" aria-modal="true" aria-labelledby="connection-title">
        <div className="modal-topline"><span className="modal-kicker">Your setup</span><button className="close-button" type="button" onClick={onClose} aria-label="Close"><span aria-hidden="true">×</span></button></div>
        <h2 id="connection-title">Bring your <em>model.</em></h2>
        <p className="modal-copy">Enter your provider details first. You can choose a model beside the chat input after the connection is checked.</p>

        <form className="connection-panel byok-panel" onSubmit={(event) => void verifyByok(event)}>
          <h3>Use your own key</h3>
          <p>EnglishFix sends requests directly from this browser to the provider you choose. Your key is never sent to or stored by an EnglishFix server.</p>
          <div className="field-group"><label htmlFor="base-url">Base URL</label><input id="base-url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.openai.com/v1" autoComplete="url" /><span>Include the provider's API version, such as <code>/v1</code>.</span></div>
          <div className="field-group"><label htmlFor="api-key">API key</label><input id="api-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-..." autoComplete="off" /><span>Saved only in this browser's local storage. Review the open-source code before using a public deployment.</span></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-accent full-button" type="submit" disabled={isBusy}>
            {isBusy ? <><span className="spinner" /> Checking connection...</> : <>Check connection <Icon>→</Icon></>}
          </button>
          <p className="verify-note">EnglishFix checks <code>GET /models</code> directly, then makes the model picker available beside the chat input. Your provider must allow browser requests (CORS).</p>
        </form>
        <p className="modal-footnote"><Icon>⌁</Icon> Disconnect removes the saved key from this browser. Never use a personal key on an untrusted device.</p>
      </div>
    </div>
  );
}

function HistoryModal({
  history,
  onClose,
  onLoad,
  onDelete,
  onClear,
}: {
  history: HistoryItem[];
  onClose: () => void;
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <div className="modal-topline"><span className="modal-kicker">Saved locally</span><button className="close-button" type="button" onClick={onClose} aria-label="Close"><span aria-hidden="true">×</span></button></div>
        <div className="history-title-row"><div><h2 id="history-title">Your little archive.</h2><p className="modal-copy">Drafts you have analyzed are saved in this browser.</p></div><span className="history-count">{history.length} {history.length === 1 ? "item" : "items"}</span></div>
        {history.length === 0 ? (
          <div className="history-empty"><span className="empty-orb">↺</span><strong>No history yet.</strong><p>Your first analyzed draft will appear here.</p></div>
        ) : (
          <>
            <div className="history-list">
              {history.map((item) => (
                <div className="history-item" key={item.id}>
                  <button className="history-open" type="button" onClick={() => onLoad(item)}>
                    <span className="history-preview">{item.input}</span>
                    <span className="history-meta">{new Date(item.result.createdAt).toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} <span>·</span> {item.result.sentences.length} {item.result.sentences.length === 1 ? "sentence" : "sentences"}</span>
                  </button>
                  <button className="history-delete" type="button" onClick={() => onDelete(item.id)} aria-label="Delete history item"><span aria-hidden="true">×</span></button>
                </div>
              ))}
            </div>
            <button className="button button-danger" type="button" onClick={onClear}><Icon>×</Icon> Clear all history</button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
