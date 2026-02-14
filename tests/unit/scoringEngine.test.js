import { describe, expect, it } from "vitest";

import {
  DEFAULT_WEIGHTS,
  calculateLessonComposite,
  normalizeWeights,
  recomputeHistoryWithWeights,
  scoreToCefrBand,
} from "../../src/core/scoringEngine.js";

describe("scoringEngine", () => {
  it("normalizes weights to 1", () => {
    const weights = normalizeWeights({ grammar: 2, verbs: 2, vocabulary: 1, fluency: 1 });
    const total = Object.values(weights).reduce((acc, value) => acc + value, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("falls back to defaults when all weights are zero", () => {
    const weights = normalizeWeights({ grammar: 0, verbs: 0, vocabulary: 0, fluency: 0 });
    expect(weights).toEqual(DEFAULT_WEIGHTS);
  });

  it("computes deterministic composite score", () => {
    const score = calculateLessonComposite({
      grammar: 80,
      verbs: 60,
      vocabulary: 70,
      fluency: 50,
    });

    expect(score).toBe(67);
  });

  it("maps score to CEFR", () => {
    expect(scoreToCefrBand(19)).toBe("pre-A1");
    expect(scoreToCefrBand(21)).toBe("A1.1");
    expect(scoreToCefrBand(52)).toBe("A2.1");
    expect(scoreToCefrBand(77)).toBe("B1.1");
  });

  it("recomputes all historical lesson scores when weights change", () => {
    const history = [
      {
        resultId: "r1",
        factors: { grammar: 80, verbs: 70, vocabulary: 60, fluency: 50 },
        lessonScore: 0,
      },
      {
        resultId: "r2",
        factors: { grammar: 50, verbs: 50, vocabulary: 50, fluency: 50 },
        lessonScore: 0,
      },
    ];

    const recomputed = recomputeHistoryWithWeights(history, {
      grammar: 1,
      verbs: 0,
      vocabulary: 0,
      fluency: 0,
    });

    expect(recomputed.history[0].lessonScore).toBe(80);
    expect(recomputed.history[1].lessonScore).toBe(50);
    expect(recomputed.overallScore).toBe(65);
  });
});
