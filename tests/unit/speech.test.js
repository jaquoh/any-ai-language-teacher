import { describe, expect, it } from "vitest";

import { buildVerbSpeechText, choosePreferredVoice } from "../../src/core/speech.js";

describe("speech", () => {
  it("prefers Anna for German when available", () => {
    const voices = [
      { name: "Google Deutsch", lang: "de-DE" },
      { name: "Anna-de-DE", lang: "de-DE" },
    ];

    const selected = choosePreferredVoice(voices, "de-DE");
    expect(selected.name).toBe("Anna-de-DE");
  });

  it("prefers Samantha for English when available", () => {
    const voices = [
      { name: "Microsoft David", lang: "en-US" },
      { name: "Samantha", lang: "en-US" },
    ];

    const selected = choosePreferredVoice(voices, "en-US");
    expect(selected.name).toBe("Samantha");
  });

  it("falls back to language match when preferred name missing", () => {
    const voices = [
      { name: "Google Francais", lang: "fr-FR" },
      { name: "Google Deutsch", lang: "de-DE" },
    ];

    const selected = choosePreferredVoice(voices, "de-DE");
    expect(selected.name).toBe("Google Deutsch");
  });

  it("builds full conjugation speech text", () => {
    const text = buildVerbSpeechText({
      infinitive: "sein",
      present: {
        ich: "bin",
        du: "bist",
        er_sie_es: "ist",
        wir: "sind",
        ihr: "seid",
        sie_Sie: "sind",
      },
    });

    expect(text).toContain("wir sind");
    expect(text).toContain("ihr seid");
    expect(text).toContain("sie Sie sind");
  });
});
