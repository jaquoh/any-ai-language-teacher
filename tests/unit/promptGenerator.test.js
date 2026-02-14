import { describe, expect, it } from "vitest";

import progressSample from "../../examples/progress-data.sample.json";
import plan from "../../data/learning-plan/de/german-a1-b1.v1.json";
import { buildNextLessonPacket, renderNextLessonPrompt } from "../../src/core/promptGenerator.js";
import { validateBySchema } from "../../src/core/validator.js";

describe("promptGenerator", () => {
  it("builds packet that passes schema", () => {
    const packet = buildNextLessonPacket(progressSample, plan);
    const validation = validateBySchema("nextLessonPacket", packet);

    expect(validation.valid).toBe(true);
    expect(packet.teacherContract.openingGuidance).toContain("your own words");
    expect(packet.teacherContract.lessonLengthMin.min).toBe(15);
    expect(packet.teacherContract.lessonLengthMin.max).toBe(20);
  });

  it("renders strict ending instructions", () => {
    const packet = buildNextLessonPacket(progressSample, plan);
    const prompt = renderNextLessonPrompt(packet);

    expect(prompt).toContain("Required Lesson Ending Format");
    expect(prompt).toContain("One fenced JSON block with LessonResultData");
    expect(prompt).toContain("Embedded LessonResultData JSON Template");
    expect(prompt).toContain("\"lessonCoverage\"");
    expect(prompt).toContain("Do NOT reference external files");
    expect(prompt).toContain("Lesson Opening");
    expect(prompt).toContain("4 to 7 varied activities");
  });
});
