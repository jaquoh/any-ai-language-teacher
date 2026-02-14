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

  it("validates progress sample", () => {
    const result = validateBySchema("progressData", progressSample);
    expect(result.valid).toBe(true);
  });

  it("accepts valid lesson result", () => {
    const result = validateBySchema("lessonResult", validLessonResult);
    expect(result.valid).toBe(true);
  });

  it("accepts legacy lesson result without metadata fields", () => {
    const legacy = structuredClone(validLessonResult);
    delete legacy.aiSource;
    delete legacy.timeSpentMin;
    delete legacy.resultAddedAt;

    const result = validateBySchema("lessonResult", legacy);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid lesson result", () => {
    const result = validateBySchema("lessonResult", invalidLessonResult);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
