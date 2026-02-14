export function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

export function isoNow() {
  return new Date().toISOString();
}

export function parseJsonMaybeFenced(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    throw new Error("No content provided.");
  }

  const blockRegex = /```json\s*([\s\S]*?)```/gi;
  let lastMatch = null;
  for (const match of raw.matchAll(blockRegex)) {
    lastMatch = match[1];
  }

  const jsonCandidate = lastMatch ? lastMatch.trim() : raw;

  try {
    return JSON.parse(jsonCandidate);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}

export function uniqStrings(items = []) {
  return [...new Set(items.filter(Boolean).map((item) => String(item)))];
}
