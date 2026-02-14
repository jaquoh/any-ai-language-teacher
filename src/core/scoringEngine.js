export const DEFAULT_WEIGHTS = {
  grammar: 0.35,
  verbs: 0.25,
  vocabulary: 0.2,
  fluency: 0.2,
};

export const SCORE_KEYS = ["grammar", "verbs", "vocabulary", "fluency"];

export function normalizeWeights(inputWeights = DEFAULT_WEIGHTS) {
  const safe = {};
  let total = 0;

  for (const key of SCORE_KEYS) {
    const value = Number(inputWeights[key] ?? 0);
    const bounded = Number.isFinite(value) && value > 0 ? value : 0;
    safe[key] = bounded;
    total += bounded;
  }

  if (total <= 0) {
    return { ...DEFAULT_WEIGHTS };
  }

  const normalized = {};
  for (const key of SCORE_KEYS) {
    normalized[key] = safe[key] / total;
  }

  return normalized;
}

export function calculateLessonComposite(scores, weights = DEFAULT_WEIGHTS) {
  const normalized = normalizeWeights(weights);
  let composite = 0;

  for (const key of SCORE_KEYS) {
    const raw = Number(scores?.[key] ?? 0);
    const bounded = Math.max(0, Math.min(100, raw));
    composite += bounded * normalized[key];
  }

  return Math.round(composite * 100) / 100;
}

export function scoreToCefrBand(score) {
  if (score < 20) {
    return "pre-A1";
  }
  if (score < 35) {
    return "A1.1";
  }
  if (score < 50) {
    return "A1.2";
  }
  if (score < 60) {
    return "A2.1";
  }
  if (score < 70) {
    return "A2.2";
  }
  if (score < 80) {
    return "B1.1";
  }
  return "B1.2";
}

export function confidenceFromHistory(historyLength) {
  if (historyLength <= 0) {
    return 0.5;
  }
  return Math.min(0.95, 0.5 + historyLength * 0.03);
}

export function computeTrend(scores) {
  if (!Array.isArray(scores) || scores.length < 3) {
    return "flat";
  }

  const recent = scores.slice(-3);
  const delta = recent[2] - recent[0];

  if (delta > 3) {
    return "up";
  }
  if (delta < -3) {
    return "down";
  }
  return "flat";
}

export function recomputeHistoryWithWeights(lessonHistory = [], weights = DEFAULT_WEIGHTS) {
  const normalized = normalizeWeights(weights);
  const rescored = lessonHistory.map((entry) => {
    const lessonScore = calculateLessonComposite(entry.factors || {}, normalized);
    return {
      ...entry,
      lessonScore,
    };
  });

  const values = rescored.map((entry) => entry.lessonScore);
  const overallScore = values.length
    ? Math.round((values.reduce((acc, value) => acc + value, 0) / values.length) * 100) / 100
    : 20;
  const trend = computeTrend(values);

  return {
    history: rescored,
    overallScore,
    trend,
    cefrEstimate: {
      band: scoreToCefrBand(overallScore),
      confidence: confidenceFromHistory(values.length),
    },
  };
}
