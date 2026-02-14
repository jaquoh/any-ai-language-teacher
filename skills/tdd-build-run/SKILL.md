Skill:
tdd-build-run

Purpose

    Enforce a test-first workflow to compile, run, and ship changes safely for this app.

When to use

    - Implementing or refactoring any core logic in `src/core`.
    - Changing UI behavior or page interactions in `src/ui`.
    - Updating build config, test config, or schema contracts.

Inputs

    - Repository root path.
    - Node/npm installed.
    - Target files changed in `src/`, `tests/`, `data/schemas/`, or config files.

Workflow

    Step one.
    Write or update failing unit tests before editing behavior.
    Step two.
    Implement minimal code to make tests pass, then refactor.
    Step three.
    Run unit tests, then integration tests, then verify app dev/build commands.

Validation

    Commands or checks to run (if any).
    - `npm run test:unit`
    - `npm run test:integration`
    - `npm run build`

Notes

    Edge cases, gotchas, or repo-specific conventions.
    - Keep schema-related changes covered by validator tests.
    - Do not merge behavior changes without both unit and integration suites passing.
