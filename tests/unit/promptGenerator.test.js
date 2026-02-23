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
    expect(packet.responseContract.lessonResultTemplate.aiSource).toBeDefined();
    expect(packet.responseContract.lessonResultTemplate.aiSource.model).toContain("model");
  });

  it("renders strict ending instructions", () => {
    const packet = buildNextLessonPacket(progressSample, plan);
    const prompt = renderNextLessonPrompt(packet);

    expect(prompt).toContain("Required Lesson Ending Format");
    expect(prompt).toContain("One fenced JSON block with LessonResultData");
    expect(prompt).toContain("Embedded LessonResultData JSON Template");
    expect(prompt).toContain("\"lessonCoverage\"");
    expect(prompt).toContain("\"aiSource\"");
    expect(prompt).toContain("\"model\"");
    expect(prompt).toContain("Do NOT reference external files");
    expect(prompt).toContain("Set aiSource with your exact AI model name");
    expect(prompt).toContain("Mandatory Interaction Protocol");
    expect(prompt).toContain("If the user writes `focus`");
    expect(prompt).toContain("Lesson Opening");
    expect(prompt).toContain("4 to 7 varied activities");
    expect(prompt).toContain("Language-Specific Pitfalls To Teach");
    expect(prompt).toContain("Long compound nouns");
    expect(prompt).toContain("Learner native language (main instruction language)");
    expect(prompt).toContain("interactive chat lesson in dialogue form");
    expect(prompt).toContain("Pre-teaching overview must assume the learner may know none of the new items yet");
    expect(prompt).toContain("Main conversation language MUST be");
    expect(prompt).toContain("Instruction language (main language for explanations/chat)");
    expect(prompt).toContain("Teaching target language (what the learner is learning/practicing)");
    expect(prompt).toContain("Do NOT run the overall conversation primarily in");
    expect(prompt).toContain("at least ~80% of your teacher explanations/instructions should stay");
    expect(prompt).toContain("IMPORTANT anti-drift rule");
    expect(prompt).toContain("it does NOT change your teaching language");
  });
});
