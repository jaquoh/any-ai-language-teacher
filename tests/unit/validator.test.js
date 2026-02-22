import { describe, expect, it } from "vitest";

import learningPlan from "../../data/learning-plan/de/german-a1-b1.v1.json";
import progressSample from "../../examples/progress-data.sample.json";
import validLessonResult from "../../examples/lesson-result.valid.sample.json";
import invalidLessonResult from "../../examples/lesson-result.invalid.sample.json";
import { schemaKeys, validateBySchema } from "../../src/core/validator.js";

describe("validator", () => {
  it("registers all expected schema keys", () => {
    expect(schemaKeys()).toEqual([
      "learningPlan",
      "progressData",
      "lessonResult",
      "nextLessonPacket",
    ]);
  });

  it("validates learning plan sample", () => {
    const result = validateBySchema("learningPlan", learningPlan);
    expect(result.valid).toBe(true);
  });

  it("keeps immigration/interview coverage and unique verbs across modules", () => {
    const allTopics = (learningPlan.modules || [])
      .flatMap((module) => module.vocabThemes || [])
      .map((topic) => String(topic || "").toLowerCase());

    expect(allTopics.some((topic) => topic.includes("immigration"))).toBe(true);
    expect(allTopics.some((topic) => topic.includes("interview"))).toBe(true);

    const seen = new Set();
    const duplicates = [];

    for (const module of learningPlan.modules || []) {
      for (const verb of module.verbTargets || []) {
        const key = String(verb.infinitive || "").trim().toLowerCase();
        if (!key) {
          continue;
        }
        if (seen.has(key)) {
          duplicates.push(key);
        } else {
          seen.add(key);
        }
      }
    }

    expect(duplicates).toEqual([]);
  });

  it("validates progress sample", () => {
    const result = validateBySchema("progressData", progressSample);
    expect(result.valid).toBe(true);
  });

  it("accepts valid lesson result", () => {
    const result = validateBySchema("lessonResult", validLessonResult);
    expect(result.valid).toBe(true);
  });

  it("accepts lesson result when aiSource is omitted", () => {
    const legacy = structuredClone(validLessonResult);
    delete legacy.aiSource;

    const result = validateBySchema("lessonResult", legacy);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid lesson result", () => {
    const result = validateBySchema("lessonResult", invalidLessonResult);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
