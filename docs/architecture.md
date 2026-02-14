# Architecture

## Runtime model
- Single-page app built with Vite and vanilla JS modules.
- Local data state in memory, with file import/export for durable persistence.
- No backend dependencies.

## Data flow
1. Load or create `ProgressData`.
2. Generate `NextLessonPromptPacket`.
3. Run lesson in external AI chat.
4. Paste lesson output and validate as `LessonResultData`.
5. Apply update to progress state and recompute scorecard.
6. Export updated `ProgressData`.

## Modules
- `src/core/validator.js`: AJV schema validation.
- `src/core/importEngine.js`: parsing, validation, and repair-prompt path.
- `src/core/progressUpdater.js`: deterministic state mutation on valid import.
- `src/core/scoringEngine.js`: formula + CEFR mapping + historical recompute.
- `src/core/promptGenerator.js`: portable prompt packet creation.
- `src/core/topicSelector.js`: topic and module progression logic.
