import { TRANSLATION_LANGUAGES } from "../../lib/languages";
import type { ConnectionSession, ThemeMode, TranslationLanguage } from "../../types";
import { CustomSelect } from "../ui/CustomSelect";
import { ThemeIcon } from "../ui/ThemeIcon";

const brandLogoUrl = new URL("../../../assets/englishfix-logo.svg", import.meta.url).href;

type SiteHeaderProps = {
  session: ConnectionSession | null;
  themeMode: ThemeMode;
  translationLanguage: TranslationLanguage;
  isAnalyzing: boolean;
  onTranslationLanguageChange: (language: string) => void;
  onThemeToggle: () => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenConnection: () => void;
  onDisconnect: () => void;
};

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 8.5V4.75m0 0h3.75m-3.75 0 2.7 2.7a7.5 7.5 0 1 1-1.85 7.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4.35l2.8 1.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader({
  session,
  themeMode,
  translationLanguage,
  isAnalyzing,
  onTranslationLanguageChange,
  onThemeToggle,
  onNewChat,
  onOpenHistory,
  onOpenConnection,
  onDisconnect,
}: SiteHeaderProps) {
  const nextTheme = themeMode === "dark" ? "light" : "dark";

  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="EnglishFix home">
        <img className="brand-mark" src={brandLogoUrl} alt="" aria-hidden="true" />
        <span className="brand-name">english<span>fix</span></span>
      </a>

      <nav className="header-actions" aria-label="Main navigation">
        <div className="header-language">
          <CustomSelect
            value={translationLanguage}
            options={TRANSLATION_LANGUAGES.map((language) => ({
              value: language.id,
              label: language.label,
              flag: language.flag,
            }))}
            onChange={onTranslationLanguageChange}
            ariaLabel="Choose translation language"
            disabled={isAnalyzing}
          />
        </div>

        <button
          className="theme-toggle"
          type="button"
          onClick={onThemeToggle}
          aria-label={`Switch to ${nextTheme} mode`}
          title={`Switch to ${nextTheme} mode`}
        >
          <ThemeIcon theme={themeMode} />
        </button>

        <span className={`mode-badge ${session ? "is-connected" : ""}`}>
          <span className="status-dot" aria-hidden="true" />
          {session ? `BYOK · ${session.modelId}` : "LLM not connected"}
        </span>

        <button className="button button-quiet nav-button" type="button" onClick={onOpenHistory}>
          <span className="nav-icon"><HistoryIcon /></span>
          <span>History</span>
        </button>
        <button className="button button-outline nav-button" type="button" onClick={onNewChat}>
          <span className="nav-icon"><PlusIcon /></span>
          <span>New chat</span>
        </button>

        {session ? (
          <button className="button button-outline connection-button" type="button" onClick={onDisconnect}>
            Disconnect
          </button>
        ) : (
          <button className="button button-dark connection-button" type="button" onClick={onOpenConnection}>
            Connect LLM
          </button>
        )}
      </nav>
    </header>
  );
}
