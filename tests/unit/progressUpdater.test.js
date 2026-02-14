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
    const [entry] = updated.lessonHistory;

    expect(updated.lessonHistory.length).toBe(1);
    expect(updated.knowledgeLedger.vocabulary.length).toBe(1);
    expect(updated.knowledgeLedger.verbs.length).toBe(1);
    expect(updated.knowledgeLedger.grammar.length).toBe(1);
    expect(updated.importedResultIds).toContain("result-0001");
    expect(entry.durationMin).toBe(lessonResult.durationMin);
    expect(entry.aiSource).toEqual({
      model: "ChatGPT-5",
      company: "OpenAI",
    });
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

  it("fills missing ai metadata for legacy lesson results", () => {
    const legacyResult = structuredClone(lessonResult);
    delete legacyResult.aiSource;

    const updated = applyLessonResult(progressSample, legacyResult, plan);
    const [entry] = updated.lessonHistory;

    expect(entry.aiSource).toEqual({
      model: "unknown",
      company: "unknown",
    });
  });

  it("normalizes legacy aiSource.name to aiSource.model during recompute", () => {
    const progress = structuredClone(progressSample);
    progress.lessonHistory = [
      {
        resultId: "result-legacy-1",
        timestamp: "2026-02-13T08:00:00.000Z",
        aiSource: {
          name: "Legacy Tutor",
          company: "Legacy Inc",
        },
        moduleId: "de-a1-1",
        topic: "greetings",
        factors: {
          grammar: 55,
          verbs: 52,
          vocabulary: 58,
          fluency: 50,
        },
        lessonScore: 54,
        summary: "Legacy entry without metadata.",
      },
    ];

    const rescored = applyScoreWeights(progress, progress.scoreConfig.weights);

    expect(rescored.lessonHistory[0].aiSource).toEqual({
      model: "Legacy Tutor",
      company: "Legacy Inc",
    });
  });
});
