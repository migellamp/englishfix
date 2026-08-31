import type { AnalysisMode } from "../types";

export type AnalysisModeOption = {
  id: AnalysisMode;
  label: string;
  shortLabel: string;
  buttonLabel: string;
  description: string;
};

export const ANALYSIS_MODES: AnalysisModeOption[] = [
  {
    id: "fix",
    label: "Fix grammar & vocabulary",
    shortLabel: "Grammar & vocabulary",
    buttonLabel: "Fix my English",
    description: "Correct meaningful mistakes while keeping your original voice.",
  },
  {
    id: "natural",
    label: "Natural rephrase",
    shortLabel: "Natural rephrase",
    buttonLabel: "Rephrase naturally",
    description: "Make correct English sound fluent, familiar, and natural.",
  },
  {
    id: "ielts",
    label: "IELTS high band",
    shortLabel: "IELTS high band",
    buttonLabel: "Improve for IELTS",
    description: "Elevate vocabulary and sentence control for formal IELTS writing.",
  },
];

export function isAnalysisMode(value: string | null | undefined): value is AnalysisMode {
  return ANALYSIS_MODES.some((mode) => mode.id === value);
}

export function getAnalysisMode(value: AnalysisMode | null | undefined): AnalysisModeOption {
  return ANALYSIS_MODES.find((mode) => mode.id === value) ?? ANALYSIS_MODES[0];
}
