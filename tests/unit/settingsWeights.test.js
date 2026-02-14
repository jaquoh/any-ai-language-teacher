import { describe, expect, it } from "vitest";

import {
  toPercentWeights,
  rebalancePercentWeights,
} from "../../src/ui/pages/settings.js";

describe("settings weight slider math", () => {
  it("converts ratio weights into integer percentages totaling 100", () => {
    const percent = toPercentWeights({
      grammar: 0.35,
      verbs: 0.25,
      vocabulary: 0.2,
      fluency: 0.2,
    });

    const total = Object.values(percent).reduce((sum, value) => sum + value, 0);

    expect(total).toBe(100);
    expect(percent).toEqual({
      grammar: 35,
      verbs: 25,
      vocabulary: 20,
      fluency: 20,
    });
  });

  it("rebalances other weights proportionally while dragging one slider", () => {
    const next = rebalancePercentWeights(
      { grammar: 35, verbs: 25, vocabulary: 20, fluency: 20 },
      "grammar",
      50,
    );

    expect(next.grammar).toBe(50);
    expect(next).toEqual({
      grammar: 50,
      verbs: 19,
      vocabulary: 16,
      fluency: 15,
    });
    expect(Object.values(next).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it("distributes evenly when the other sliders are all zero", () => {
    const next = rebalancePercentWeights(
      { grammar: 100, verbs: 0, vocabulary: 0, fluency: 0 },
      "grammar",
      40,
    );

    expect(next).toEqual({
      grammar: 40,
      verbs: 20,
      vocabulary: 20,
      fluency: 20,
    });
    expect(Object.values(next).reduce((sum, value) => sum + value, 0)).toBe(100);
  });
});
