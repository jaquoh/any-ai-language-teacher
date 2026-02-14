Skill:
schema-contract-safety

Purpose

    Protect lesson import reliability by enforcing strict JSON schema contracts and repair-flow behavior.

When to use

    - Editing schema files under `data/schemas/`.
    - Modifying import parsing, validation, or repair prompt logic.
    - Updating prompt contract rules that affect lesson result output.

Inputs

    - Schema files in `data/schemas/*.schema.json`.
    - Import pipeline files in `src/core/importEngine.js` and `src/core/validator.js`.
    - Sample payloads in `examples/`.

Workflow

    Step one.
    Update schema and matching sample payloads first.
    Step two.
    Add/adjust unit tests for valid and invalid payload behavior.
    Step three.
    Confirm invalid imports fail atomically and repair prompt includes exact errors.

Validation

    Commands or checks to run (if any).
    - `npm run test:unit -- tests/unit/validator.test.js`
    - `npm run test:unit -- tests/unit/importEngine.test.js`

Notes

    Edge cases, gotchas, or repo-specific conventions.
    - Keep `additionalProperties: false` in core objects.
    - Ensure only one final JSON block is accepted from lesson output content.
