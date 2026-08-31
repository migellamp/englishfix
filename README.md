<div align="center">
  <img src="./assets/englishfix-logo.svg?v=chat-bubble" alt="EnglishFix logo" width="96" />

  <h1>EnglishFix</h1>

  <p><strong>Make it sound like you.</strong></p>

  <p>An AI-assisted English writing coach that corrects grammar, clarifies meaning, and preserves your voice.</p>

  <p>
    <img src="https://img.shields.io/badge/status-experimental-2563eb?style=flat-square" alt="Experimental" />
    <img src="https://img.shields.io/badge/React-18-17243a?style=flat-square&logo=react&logoColor=61DAFB" alt="React 18" />
    <img src="https://img.shields.io/badge/TypeScript-5.7-17243a?style=flat-square&logo=typescript&logoColor=3178C6" alt="TypeScript 5.7" />
    <img src="https://img.shields.io/badge/Vite-6-17243a?style=flat-square&logo=vite&logoColor=646CFF" alt="Vite 6" />
  </p>
</div>

## Overview

EnglishFix is a local-first web application that helps people learn from every English correction. Paste or write a draft, select an analysis mode, and connect your own AI provider through BYOK (Bring Your Own Key).

Each analysis includes:

- the original text with words and phrases that need attention;
- a corrected version;
- explanations and replacement suggestions for individual tokens;
- contextual translation in the language you select;
- controls to apply one suggestion, apply all suggestions, or copy the final result.

## Analysis modes

| Mode | Best for | What it does |
| --- | --- | --- |
| **Fix grammar & vocabulary** | Everyday corrections | Fixes important spelling, grammar, word choice, and clarity issues without changing the writer's style or making the vocabulary needlessly complex. |
| **Natural rephrase** | More natural writing | Rephrases stiff, overly literal, or uncommon wording into fluent English while retaining the original meaning, facts, and tone. |
| **IELTS high band** | IELTS Writing preparation | Improves accuracy, lexical resource, grammatical range, cohesion, and academic style toward formal Band 8–9 writing without changing the intended message. |

## Translation languages

The language selector in the navigation bar includes clear country-flag icons and remembers your latest choice in the browser. EnglishFix currently supports:

- Indonesian and Malay;
- Thai and Vietnamese;
- Simplified Chinese, Japanese, and Korean;
- Spanish, French, German, and Portuguese;
- Arabic.

The selected language is also saved with each analysis result. Reopening an item from the history automatically restores the language used when that result was created.

## Themes

Use the SVG moon/sun control in the shared navigation bar to switch between the light and high-contrast dark themes. The preference is stored in `localStorage` and follows the system preference the first time the application is opened.

## How it works

```text
User draft
     │
     ├── select analysis mode + model
     │
     ▼
EnglishFix browser ── GET /models ──► OpenAI-compatible provider
     │                               │
     │                               └── POST /chat/completions
     │                                      with JSON instructions
     ▼
JSON response parser
     │
     ├── token annotations + correction reasons
     ├── corrected version
     ├── selected-language translation
     └── local history
```

1. The user enters a draft and chooses an analysis mode.
2. When a connection is created, the browser calls `GET /models` to validate the provider and load available models.
3. When analysis starts, the browser sends `POST /chat/completions` directly to the selected provider.
4. The model returns structured JSON containing sentences, original tokens, error states, suggestions, explanations, and translations.
5. EnglishFix parses the response and renders it as an interactive result.
6. Applied suggestions rebuild the corrected text in the browser without requesting another analysis.

## UI architecture

The frontend follows a component-based structure. `App.tsx` owns application state and coordinates the main workflows, while rendering is delegated to focused components.

- `SiteHeader` is the single navigation component used by the initial editor, analysis results, and loaded history views. Language, theme, connection, history, and new-chat controls therefore stay consistent across the application.
- Editor components render the introduction, draft input, analysis-mode selector, model selector, and empty state.
- Result components render annotations, suggestions, corrected text, and contextual translations.
- Modal components isolate connection setup and locally stored history.
- UI primitives provide reusable select, icon, and theme-icon implementations.

View state is represented by classes such as `initial-view`, `results-view`, and `history-view`. These classes only adjust page-level layout; they do not replace or restyle the shared navbar.

## Privacy and BYOK

EnglishFix does not provide an API key. You provide your own:

- **Base URL**, such as `https://api.openai.com/v1`;
- provider **API key**;
- an available provider model.

Analysis requests, drafts, API keys, and provider responses are sent directly from the browser to the selected provider. The EnglishFix worker does not receive or store them. History, the latest mode, translation language, theme, and connection session are stored in browser `localStorage`. History is capped at the latest 50 items.

> **Important:** `localStorage` is not a secret store. An untrusted deployment, browser extension, injected script, or shared computer may expose an API key. Use only deployments and devices you trust, review the source before entering a key, and select **Disconnect** when you finish.

## Provider requirements

Your provider must:

- expose an OpenAI-compatible `GET /models` endpoint;
- expose `POST /chat/completions`;
- accept an `Authorization: Bearer <API_KEY>` header;
- allow browser requests through CORS;
- return a model list with `data[].id`;
- support JSON output, or respond when `response_format` is unavailable.

## Run locally

### Docker (recommended)

Build and start EnglishFix in the background:

```bash
docker compose up -d --build
```

Open `http://localhost:8080`. The container restarts automatically unless you stop it manually.

To use a different host port, set `APP_PORT` before starting Compose. For example:

```bash
APP_PORT=3000 docker compose up -d --build
```

On PowerShell:

```powershell
$env:APP_PORT=3000
docker compose up -d --build
```

Stop the application with:

```bash
docker compose down
```

### Without Docker

### 1. Clone and install

```bash
git clone https://github.com/USERNAME/englishfix.git
cd englishfix
npm install
```

### 2. Start the development server

```bash
npm run dev
```

Open the local URL shown by Vite, select **Connect LLM**, and enter your provider details. The current BYOK flow does not require an API key in `.env`.

### 3. Create a production build

```bash
npm run build
npm run preview
```

The build is generated in `dist/`. `server/worker.ts` is a hosting fallback only; it neither handles AI requests nor stores credentials.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server. |
| `npm run build` | Type-checks TypeScript, creates the production build, and builds the worker. |
| `npm run preview` | Runs a preview of the production output. |

## Project structure

```text
.
├── src/
│   ├── App.tsx                         # Application state and workflow orchestration
│   ├── main.tsx                        # React entry point and global stylesheet import
│   ├── types.ts                        # Analysis, history, theme, and connection types
│   ├── components/
│   │   ├── editor/
│   │   │   ├── DraftEditor.tsx         # Draft input, analysis mode, model, and submit action
│   │   │   ├── EmptyState.tsx          # Initial workflow guidance
│   │   │   └── Hero.tsx                # Introductory page content
│   │   ├── layout/
│   │   │   ├── SiteFooter.tsx          # Shared application footer
│   │   │   └── SiteHeader.tsx          # Shared navbar for every application view
│   │   ├── modals/
│   │   │   ├── ConnectionModal.tsx     # BYOK provider connection form
│   │   │   └── HistoryModal.tsx        # Local history browser and management actions
│   │   ├── results/
│   │   │   └── AnalysisResults.tsx     # Annotated, corrected, and translated results
│   │   └── ui/
│   │       ├── CustomSelect.tsx         # Accessible reusable custom select
│   │       ├── Icon.tsx                 # Inline icon wrapper
│   │       └── ThemeIcon.tsx            # SVG light/dark theme icons
│   ├── lib/
│   │   ├── analysis.ts                 # Text rebuilding and suggestion application
│   │   ├── languages.ts                # Translation-language metadata
│   │   ├── llmClient.ts                # Provider integration and JSON response parsing
│   │   ├── mockAnalyzer.ts             # Local mock analysis helper
│   │   ├── modes.ts                    # Analysis-mode definitions
│   │   └── storage.ts                  # localStorage persistence helpers
│   └── styles.css                      # Themes, component styles, and responsive layout
├── server/
│   └── worker.ts                       # Hosting fallback with no AI route
├── scripts/
│   └── build-server.mjs                # Worker build script
├── assets/
│   └── englishfix-logo.svg             # EnglishFix brand mark
├── index.html                          # HTML entry point and app metadata
├── package.json                        # Dependencies and project commands
├── tsconfig.json                       # TypeScript project configuration
└── vite.config.ts                      # Vite configuration
```

## Contributing

Contributions are welcome. For substantial changes, please open an issue first so the direction can be discussed.

```bash
git checkout -b feat/change-name
npm install
npm run build
git add .
git commit -m "feat: describe the change"
git push origin feat/change-name
```

When opening a pull request, include a change summary, verification steps, and notes for any changes to the provider-response format or browser-stored data.

## Project status

EnglishFix is experimental. LLM response formats, provider support, and the user experience may change. Always review corrections before using them in emails, formal documents, or submitted work.

## License

No license has been selected yet. Add a `LICENSE` file before distributing EnglishFix as open source.
