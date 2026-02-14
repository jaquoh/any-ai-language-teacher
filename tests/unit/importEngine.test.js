import { describe, expect, it } from "vitest";

import progressSample from "../../examples/progress-data.sample.json";
import plan from "../../data/learning-plan/de/german-a1-b1.v1.json";
import validResult from "../../examples/lesson-result.valid.sample.json";
import { importLessonResult } from "../../src/core/importEngine.js";

describe("importEngine", () => {
  it("imports valid result", () => {
    const report = importLessonResult({
      rawInput: JSON.stringify(validResult),
      progress: progressSample,
      plan,
    });

    expect(report.ok).toBe(true);
    expect(report.updatedProgress.lessonHistory.length).toBe(1);
  });

  it("returns repair prompt on malformed input", () => {
    const report = importLessonResult({
      rawInput: "this is not json",
      progress: progressSample,
      plan,
    });

    expect(report.ok).toBe(false);
    expect(report.repairPrompt).toContain("Validation errors");
  });

  it("accepts legacy aiSource.name and removed time fields", () => {
    const legacy = structuredClone(validResult);
    legacy.timeSpentMin = 18;
    legacy.resultAddedAt = "2026-02-13T10:31:00.000Z";
    legacy.aiSource = {
      name: "Legacy Tutor",
      company: "Legacy AI",
    };

    const report = importLessonResult({
      rawInput: JSON.stringify(legacy),
      progress: progressSample,
      plan,
    });

    expect(report.ok).toBe(true);
    expect(report.updatedProgress.lessonHistory[0].aiSource).toEqual({
      model: "Legacy Tutor",
      company: "Legacy AI",
    });
  });
});
