import { parseJsonMaybeFenced } from "./normalizers.js";
import { applyLessonResult, DuplicateLessonResultError } from "./progressUpdater.js";
import { validateBySchema } from "./validator.js";
import { buildRepairPrompt } from "./repairPromptBuilder.js";

function standardizeErrors(errors) {
  return errors.map((error) => ({
    path: error.path,
    message: error.message,
    keyword: error.keyword,
  }));
}

export function importLessonResult({ rawInput, progress, plan }) {
  let parsed;

  try {
    parsed = parseJsonMaybeFenced(rawInput);
  } catch (error) {
    const errors = [{ path: "/", message: error.message, keyword: "parse" }];
    return {
      ok: false,
      errors,
      repairPrompt: buildRepairPrompt(rawInput, errors),
    };
  }

  const lessonValidation = validateBySchema("lessonResult", parsed);
  if (!lessonValidation.valid) {
    const errors = standardizeErrors(lessonValidation.errors);
    return {
      ok: false,
      errors,
      parsed,
      repairPrompt: buildRepairPrompt(rawInput, errors),
    };
  }

  if (parsed.projectId !== progress.projectId) {
    const errors = [
      {
        path: "/projectId",
        message: `Expected ${progress.projectId} but got ${parsed.projectId}`,
        keyword: "const",
      },
    ];

    return {
      ok: false,
      errors,
      parsed,
      repairPrompt: buildRepairPrompt(rawInput, errors),
    };
  }

  try {
    const updatedProgress = applyLessonResult(progress, parsed, plan);
    const progressValidation = validateBySchema("progressData", updatedProgress);

    if (!progressValidation.valid) {
      const errors = standardizeErrors(progressValidation.errors);
      return {
        ok: false,
        errors,
        parsed,
        repairPrompt: buildRepairPrompt(rawInput, errors),
      };
    }

    return {
      ok: true,
      updatedProgress,
      parsed,
      errors: [],
      repairPrompt: "",
    };
  } catch (error) {
    if (error instanceof DuplicateLessonResultError) {
      const errors = [{ path: "/resultId", message: error.message, keyword: "unique" }];
      return {
        ok: false,
        errors,
        parsed,
        repairPrompt: buildRepairPrompt(rawInput, errors),
      };
    }

    const errors = [{ path: "/", message: error.message, keyword: "runtime" }];
    return {
      ok: false,
      errors,
      parsed,
      repairPrompt: buildRepairPrompt(rawInput, errors),
    };
  }
}
