const VOICE_PREFERENCES = {
  "de-DE": {
    names: ["Anna-de-DE", "Anna"],
    languageFallbacks: ["de-DE", "de"],
  },
  "en-US": {
    names: ["Samantha-en-US", "Samantha"],
    languageFallbacks: ["en-US", "en"],
  },
};

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function choosePreferredVoice(voices, targetLang = "de-DE") {
  if (!Array.isArray(voices) || !voices.length) {
    return null;
  }

  const preference = VOICE_PREFERENCES[targetLang] || {
    names: [],
    languageFallbacks: [targetLang, targetLang.split("-")[0]],
  };

  let bestVoice = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const voice of voices) {
    const name = normalize(voice.name);
    const lang = normalize(voice.lang);
    let score = 0;

    for (let index = 0; index < preference.names.length; index += 1) {
      const preferred = normalize(preference.names[index]);
      if (!preferred) {
        continue;
      }
      if (name === preferred) {
        score = Math.max(score, 300 - index);
      } else if (name.includes(preferred)) {
        score = Math.max(score, 220 - index);
      }
    }

    for (let index = 0; index < preference.languageFallbacks.length; index += 1) {
      const fallback = normalize(preference.languageFallbacks[index]);
      if (!fallback) {
        continue;
      }
      if (lang === fallback) {
        score = Math.max(score, 150 - index);
      } else if (lang.startsWith(fallback)) {
        score = Math.max(score, 100 - index);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestVoice = voice;
    }
  }

  return bestVoice;
}

export function buildVerbSpeechText(verb) {
  if (!verb?.present) {
    return String(verb?.infinitive || "").trim();
  }

  const p = verb.present;
  return [
    `${verb.infinitive}:`,
    `ich ${p.ich},`,
    `du ${p.du},`,
    `er sie es ${p.er_sie_es},`,
    `wir ${p.wir},`,
    `ihr ${p.ihr},`,
    `sie Sie ${p.sie_Sie}.`,
  ].join(" ");
}

export function speakText(text, options = {}) {
  const { targetLang = "de-DE", rate = 0.96, pitch = 1 } = options;
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    return { ok: false, reason: "empty-text" };
  }

  if (
    typeof window === "undefined" ||
    typeof window.speechSynthesis === "undefined" ||
    typeof window.SpeechSynthesisUtterance === "undefined"
  ) {
    return { ok: false, reason: "unsupported" };
  }

  const synth = window.speechSynthesis;
  const utterance = new window.SpeechSynthesisUtterance(cleanText);
  const voice = choosePreferredVoice(synth.getVoices(), targetLang);

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = targetLang;
  }

  utterance.rate = rate;
  utterance.pitch = pitch;

  synth.cancel();
  synth.speak(utterance);

  return { ok: true, voiceName: voice?.name || null, lang: utterance.lang };
}
