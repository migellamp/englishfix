import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { DraftEditor } from "./components/editor/DraftEditor";
import { EmptyState } from "./components/editor/EmptyState";
import { Hero } from "./components/editor/Hero";
import { SiteFooter } from "./components/layout/SiteFooter";
import { SiteHeader } from "./components/layout/SiteHeader";
import { ConnectionModal } from "./components/modals/ConnectionModal";
import { HistoryModal } from "./components/modals/HistoryModal";
import {
  AnalysisResults,
  type PopoverState,
} from "./components/results/AnalysisResults";
import { rebuildResult, replaceToken } from "./lib/analysis";
import { getTranslationLanguage, isTranslationLanguage } from "./lib/languages";
import { analyzeWithProvider } from "./lib/llmClient";
import { getAnalysisMode, isAnalysisMode } from "./lib/modes";
import {
  addHistory,
  clearSession,
  readAnalysisMode,
  readHistory,
  readSession,
  readThemeMode,
  readTranslationLanguage,
  saveAnalysisMode,
  saveHistory,
  saveSession,
  saveThemeMode,
  saveTranslationLanguage,
} from "./lib/storage";
import type {
  AnalysisMode,
  AnalysisResult,
  ConnectionSession,
  HistoryItem,
  Suggestion,
  ThemeMode,
  TranslationLanguage,
} from "./types";

type ToastTone = "success" | "error" | "info";
type Toast = { message: string; tone: ToastTone } | null;

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
      showToast(
        error instanceof Error ? error.message : "Analysis failed. Please try again.",
        "error",
      );
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

  const updateActiveHistory = (updatedResult: AnalysisResult) => {
    const nextHistory = readHistory();
    const historyIndex = activeHistoryId === null
      ? 0
      : nextHistory.findIndex((item) => item.id === activeHistoryId);
    if (historyIndex < 0 || !nextHistory[historyIndex]) return;

    nextHistory[historyIndex] = { ...nextHistory[historyIndex], result: updatedResult };
    saveHistory(nextHistory);
    setHistory(nextHistory);
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
    updateActiveHistory(rebuilt);
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
    updateActiveHistory(rebuilt);
    showToast("All suggested fixes were applied.", "success");
  };

  const startNewChat = () => {
    setInput("");
    setResult(null);
    setPopover(null);
    setActiveHistoryId(null);
    setIsHistoryPreview(false);
    setIsHistoryOpen(false);
    showToast("New chat started.", "info");
  };

  const clearResult = () => {
    startNewChat();
    showToast("Draft cleared.", "info");
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

  const toggleTheme = () => {
    const nextTheme: ThemeMode = themeMode === "dark" ? "light" : "dark";
    saveThemeMode(nextTheme);
    setThemeMode(nextTheme);
  };

  const disconnect = () => {
    clearSession();
    setSession(null);
    showToast("LLM disconnected.", "info");
  };

  const displayedMode = getAnalysisMode(result?.mode ?? (isHistoryPreview ? "fix" : analysisMode));
  const displayedLanguage = getTranslationLanguage(
    result?.translationLanguage ?? (result ? "id" : translationLanguage),
  );
  const viewClass = isHistoryPreview ? "history-view" : result ? "results-view" : "initial-view";

  return (
    <div className={`app-shell theme-${themeMode} ${viewClass}`}>
      <SiteHeader
        session={session}
        themeMode={themeMode}
        translationLanguage={translationLanguage}
        isAnalyzing={isAnalyzing}
        onTranslationLanguageChange={changeTranslationLanguage}
        onThemeToggle={toggleTheme}
        onNewChat={startNewChat}
        onOpenHistory={openHistory}
        onOpenConnection={() => setIsConnectionOpen(true)}
        onDisconnect={disconnect}
      />

      <main>
        {!isHistoryPreview && (
          <>
            <Hero />
            <DraftEditor
              input={input}
              session={session}
              analysisMode={analysisMode}
              isAnalyzing={isAnalyzing}
              onInputChange={setInput}
              onEditorKeyDown={onEditorKeyDown}
              onAnalysisModeChange={changeAnalysisMode}
              onModelChange={changeModel}
              onAnalyze={() => void analyze()}
            />
          </>
        )}

        {result ? (
          <AnalysisResults
            result={result}
            errorCount={errorCount}
            modeShortLabel={displayedMode.shortLabel}
            languageLabel={displayedLanguage.label}
            popover={popover}
            onPopoverChange={setPopover}
            onApplySuggestion={applySuggestion}
            onApplyAll={applyAll}
            onClear={clearResult}
          />
        ) : !isHistoryPreview ? (
          <EmptyState />
        ) : null}
      </main>

      <SiteFooter />

      {isConnectionOpen && (
        <ConnectionModal
          onClose={() => setIsConnectionOpen(false)}
          onConnected={handleConnected}
        />
      )}
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

export default App;
