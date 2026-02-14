Skill:
curriculum-and-topic-rotation

Purpose

    Maintain CEFR-aligned curriculum progression and practical topic rotation for immigration-relevant lessons.

When to use

    - Editing the German learning plan seed.
    - Changing module progression or next-topic selection logic.
    - Revising weak-area remediation behavior.

Inputs

    - Learning plan JSON at `data/learning-plan/de/german-a1-b1.v1.json`.
    - Topic/module logic in `src/core/topicSelector.js` and `src/core/promptGenerator.js`.
    - Lesson history and mistakes in `ProgressData`.

Workflow

    Step one.
    Update module objectives, grammar/verb targets, and topic themes by CEFR order.
    Step two.
    Update selector logic to balance sequence, remediation, and anti-repeat constraints.
    Step three.
    Validate prompt packet outputs expected topic/module focus and run tests.

Validation

    Commands or checks to run (if any).
    - `npm run test:unit -- tests/unit/topicSelector.test.js`
    - `npm run test:unit -- tests/unit/promptGenerator.test.js`

Notes

    Edge cases, gotchas, or repo-specific conventions.
    - Avoid repeating the same topic in the last two lessons unless remediation is required.
    - Keep topic sets practical for daily life, work, and public-service interactions.
