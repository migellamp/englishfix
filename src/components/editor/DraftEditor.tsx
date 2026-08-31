import type { KeyboardEvent } from "react";
import { ANALYSIS_MODES, getAnalysisMode } from "../../lib/modes";
import type { AnalysisMode, ConnectionSession } from "../../types";
import { CustomSelect } from "../ui/CustomSelect";
import { Icon } from "../ui/Icon";

type DraftEditorProps = {
  input: string;
  session: ConnectionSession | null;
  analysisMode: AnalysisMode;
  isAnalyzing: boolean;
  onInputChange: (input: string) => void;
  onEditorKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onAnalysisModeChange: (mode: string) => void;
  onModelChange: (modelId: string) => void;
  onAnalyze: () => void;
};

export function DraftEditor({
  input,
  session,
  analysisMode,
  isAnalyzing,
  onInputChange,
  onEditorKeyDown,
  onAnalysisModeChange,
  onModelChange,
  onAnalyze,
}: DraftEditorProps) {
  const activeMode = getAnalysisMode(analysisMode);

  return (
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
        onChange={(event) => onInputChange(event.target.value)}
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
              options={ANALYSIS_MODES.map((mode) => ({
                value: mode.id,
                label: mode.label,
                description: mode.description,
              }))}
              onChange={onAnalysisModeChange}
              ariaLabel="Choose analysis mode"
              disabled={isAnalyzing}
            />
          </div>

          {session?.availableModels && session.availableModels.length > 0 && (
            <div className="model-picker">
              <span>Model</span>
              <CustomSelect
                value={session.modelId}
                options={session.availableModels.map((model) => ({ value: model, label: model }))}
                onChange={onModelChange}
                ariaLabel="Choose model for this analysis"
                disabled={isAnalyzing}
              />
            </div>
          )}

          <button className="button button-accent" type="button" onClick={onAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <><span className="spinner" /> Analyzing...</>
            ) : (
              <>{activeMode.buttonLabel} <Icon>→</Icon></>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
