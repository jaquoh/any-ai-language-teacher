# Specs Changelog

## 2026-02-13 - v1.0.0
- Created initial end-to-end specification for offline portable AI teacher workflow.
- Defined strict data contracts and repair flow for malformed lesson results.
- Defined deterministic scoring model with adjustable weights and full-history recompute.
- Defined German seed curriculum from A1.1 to B1.2 with immigration-focused topic rotation.

## 2026-02-13 - v1.0.1
- Updated prompt generation to embed a complete inline `LessonResultData` JSON template.
- Removed dependency on external schema file references for random AI chat environments.
- Added regression checks for embedded-template prompt content.

## 2026-02-13 - v1.0.2
- Added full verb conjugation display in Knowledge view (`ich`, `du`, `er/sie/es`, `wir`, `ihr`, `sie/Sie`).
- Added speech playback buttons for vocabulary and verb conjugations with preferred voices (`Anna-de-DE`, `Samantha-en-US`) and language fallbacks.
- Updated prompt behavior for longer, richer lessons (15-20 minutes, 4-7 activities) and removed fixed intro phrase requirement.

## 2026-02-13 - v1.0.3
- Updated the first module and default first lesson focus to `love and valentines day`.
- Redesigned Dashboard with a more modern visual style, motivational messaging, and progress insights/charts.
- Moved scoring sliders and project data controls into a dedicated `Settings` page.
- Added `canvas-confetti` celebration when a lesson result is imported successfully.
