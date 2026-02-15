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

  it("balances repetitions before reusing a topic beyond cadence", () => {
    const topic = selectNextTopic({
      moduleId: "de-a1-1",
      moduleTopics: ["office", "supermarket", "public transportation"],
      lessonHistory: [
        { moduleId: "de-a1-1", topic: "office" },
        { moduleId: "de-a1-1", topic: "office" },
        { moduleId: "de-a1-1", topic: "supermarket" },
      ],
      mistakePatterns: [],
      recommendedTopic: "",
      lessonsPerTopic: 2,
    });

    expect(topic).toBe("public transportation");
  });

  it("stays in current module before cadence completion", () => {
    const moduleId = selectNextModuleId(plan, {
      planRef: { currentModuleId: "de-a1-1" },
      lessonHistory: Array.from({ length: 12 }, (_, index) => ({
        moduleId: "de-a1-1",
        topic: `topic-${index}`,
        lessonScore: 90,
      })),
      mistakePatterns: [],
    });

    expect(moduleId).toBe("de-a1-1");
  });

  it("moves to next module after 20 lessons and 2 topic reps each", () => {
    const topics = plan.modules.find((module) => module.moduleId === "de-a1-1").vocabThemes;
    const history = [...topics, ...topics].map((topic) => ({
      moduleId: "de-a1-1",
      topic,
      lessonScore: 78,
    }));

    const moduleId = selectNextModuleId(plan, {
      planRef: { currentModuleId: "de-a1-1" },
      lessonHistory: history,
      mistakePatterns: [],
    });

    expect(moduleId).toBe("de-a1-2");
  });

  it("supports structured module topics with aliases and ids", () => {
    const topic = selectNextTopic({
      moduleId: "de-a1-1",
      module: {
        moduleId: "de-a1-1",
        lessonCadence: {
          targetLessons: 20,
          lessonsPerTopic: 2,
        },
        topics: [
          {
            id: "office-topic",
            label: "office",
            aliases: ["workplace"],
          },
          {
            id: "market-topic",
            label: "supermarket",
            aliases: ["grocery shopping"],
          },
          {
            id: "transport-topic",
            label: "public transportation",
            aliases: ["bus and train"],
          },
        ],
      },
      lessonHistory: [
        { moduleId: "de-a1-1", topic: "workplace" },
        { moduleId: "de-a1-1", topic: "office-topic" },
        { moduleId: "de-a1-1", topic: "grocery shopping" },
      ],
      mistakePatterns: [],
      recommendedTopic: "",
    });

    expect(topic).toBe("public transportation");
  });
});
