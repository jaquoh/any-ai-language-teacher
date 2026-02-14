import { describe, expect, it } from "vitest";

import { selectNextModuleId, selectNextTopic } from "../../src/core/topicSelector.js";
import plan from "../../data/learning-plan/de/german-a1-b1.v1.json";

describe("topicSelector", () => {
  it("respects anti-repeat for recent topics", () => {
    const topic = selectNextTopic({
      moduleTopics: ["office", "supermarket", "public transportation"],
      lessonHistory: [{ topic: "office" }, { topic: "supermarket" }],
      mistakePatterns: [],
      recommendedTopic: "",
    });

    expect(topic).toBe("public transportation");
  });

  it("prioritizes recommended topic", () => {
    const topic = selectNextTopic({
      moduleTopics: ["office", "supermarket", "public transportation"],
      lessonHistory: [{ topic: "office" }, { topic: "supermarket" }],
      mistakePatterns: [],
      recommendedTopic: "office",
    });

    expect(topic).toBe("office");
  });

  it("moves to next module when recent scores are strong and no active weakness", () => {
    const moduleId = selectNextModuleId(plan, {
      planRef: { currentModuleId: "de-a1-1" },
      lessonHistory: [
        { moduleId: "de-a1-1", lessonScore: 72 },
        { moduleId: "de-a1-1", lessonScore: 75 },
      ],
      mistakePatterns: [],
    });

    expect(moduleId).toBe("de-a1-2");
  });
});
