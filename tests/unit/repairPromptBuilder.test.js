import { describe, expect, it } from "vitest";

import { buildRepairPrompt } from "../../src/core/repairPromptBuilder.js";

describe("repairPromptBuilder", () => {
  it("includes all validation errors", () => {
    const prompt = buildRepairPrompt("{bad}", [
      { path: "/durationMin", keyword: "type", message: "must be integer" },
      { path: "/topic", keyword: "required", message: "is required" },
    ]);

    expect(prompt).toContain("path=/durationMin");
    expect(prompt).toContain("path=/topic");
    expect(prompt).toContain("Return only one fenced JSON block");
  });
});
