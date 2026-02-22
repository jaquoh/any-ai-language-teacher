# Any AI Teacher

Portable language-learning workflow for any AI chat.

This project lets you:
- keep structured language progress in local JSON,
- generate a self-contained lesson prompt for a fresh AI session,
- import strict lesson result data,
- update progress deterministically,
- inspect verbs, grammar, vocabulary, weak points, and CEFR estimate,
- play vocabulary and verb pronunciation with browser speech voices (prefers `Anna-de-DE` and `Samantha-en-US` when available).
- celebrate successful lesson imports with confetti feedback.

## Why this exists
Most AI lessons are trapped in one chat context. This app makes lessons portable by encoding:
- teaching contract,
- current learner progress,
- next lesson scope,
- strict result schema.

The user can move between AI providers/chats while preserving continuity.

## Stack
- Vite + vanilla JavaScript
- TailwindCSS + daisyUI
- AJV schema validation
- Vitest unit tests
- Playwright integration tests

## Data lifecycle
1. Load or create `ProgressData` JSON.
2. Generate `NextLessonPromptPacket` and paste into any AI chat.
3. Complete lesson.
4. AI returns structured `LessonResultData` JSON at lesson end.
5. Paste result into app and import.
6. App validates strictly and updates progress.
7. Export updated `ProgressData` JSON.

## Optional login + server sync
This app can run in two modes:

- Local-only mode (default fallback): no backend required.
- Server sync mode: enabled automatically when `/api/health.php` is available.

In server sync mode:
- users can register/login with `name + password`,
- progress is loaded from MySQL after login,
- progress and lesson loop are auto-saved back to the server.

Backend files and setup steps are in `backend/README.md`.

## Run locally
```bash
npm install
npm run dev
```

Open the app at `http://127.0.0.1:4173`.

## Build
```bash
npm run build
npm run preview
```

## Test
```bash
npm run test:unit
npm run test:integration
npm test
```

If Playwright browsers are missing:
```bash
npx playwright install chromium
```

## How to use
1. Start on Dashboard and keep or import a `ProgressData` file.
2. Go to Prompt Builder and click `Generate Prompt`.
3. Paste prompt into AI chat and do the lesson.
4. In Import Result, paste the lesson output and click `Validate and Import`.
5. If import fails, copy the generated repair prompt and fix JSON in AI.
6. Review updates in Lessons, Knowledge, and Dashboard.
7. Export `ProgressData`.

## Lesson output reliability
The app enforces strict schema validation.
If the lesson result is malformed, import is rejected atomically and a repair prompt is generated with exact validator errors so the lesson is not lost.
The generated next-lesson prompt includes an inline `LessonResultData` template, so random AI chats do not need access to any local file references.
The generated prompt now requests a flexible teacher greeting style and longer lessons (15-20 minutes) with broader activity coverage.

## Spec/version tracking
- `docs/specs/v1.md`
- `docs/specs/CHANGELOG.md`
- `docs/specs/v1.1.md` (future)
- `docs/specs/v2.md` (future major)

## Seed content
V1 ships with a German curriculum seed from `A1.1` through `B1.2`, including immigration-relevant rotating topics.
The first lesson starts with a themed `love and valentines day` focus to make the opening lesson more engaging.
