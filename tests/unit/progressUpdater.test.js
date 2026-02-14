import { describe, expect, it } from "vitest";

import progressSample from "../../examples/progress-data.sample.json";
import lessonResult from "../../examples/lesson-result.valid.sample.json";
import plan from "../../data/learning-plan/de/german-a1-b1.v1.json";
import {
  applyLessonResult,
  applyScoreWeights,
  DuplicateLessonResultError,
} from "../../src/core/progressUpdater.js";

describe("progressUpdater", () => {
  it("imports lesson result and updates ledgers", () => {
    const updated = applyLessonResult(progressSample, lessonResult, plan);

    expect(updated.lessonHistory.length).toBe(1);
    expect(updated.knowledgeLedger.vocabulary.length).toBe(1);
    expect(updated.knowledgeLedger.verbs.length).toBe(1);
    expect(updated.knowledgeLedger.grammar.length).toBe(1);
    expect(updated.importedResultIds).toContain("result-0001");
  });

  it("blocks duplicate result ids", () => {
    const first = applyLessonResult(progressSample, lessonResult, plan);
    expect(() => applyLessonResult(first, lessonResult, plan)).toThrow(DuplicateLessonResultError);
  });

  it("recomputes all scores when weights change", () => {
    const first = applyLessonResult(progressSample, lessonResult, plan);
    const rescored = applyScoreWeights(first, {
      grammar: 1,
      verbs: 0,
      vocabulary: 0,
      fluency: 0,
    });

    expect(rescored.lessonHistory[0].lessonScore).toBe(68);
    expect(rescored.scorecard.overallScore).toBe(68);
  });
});
