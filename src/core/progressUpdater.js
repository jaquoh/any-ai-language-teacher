import { clamp, isoNow, normalizeKey } from "./normalizers.js";
import { recomputeHistoryWithWeights } from "./scoringEngine.js";
import { selectNextModuleId, selectNextTopic } from "./topicSelector.js";

const DEFAULT_TIME_SPENT_MIN = 15;
const TIMELINE_STEP_MS = 60 * 1000;
const UNKNOWN_AI_SOURCE = {
  name: "unknown",
  company: "unknown",
};

export class DuplicateLessonResultError extends Error {
  constructor(resultId) {
    super(`Lesson result already imported: ${resultId}`);
    this.name = "DuplicateLessonResultError";
  }
}

function parseDateMs(value) {
  const ms = Date.parse(String(value || ""));
  return Number.isFinite(ms) ? ms : null;
}

function sanitizeAiSource(aiSource) {
  const name = String(aiSource?.name || "").trim();
  const company = String(aiSource?.company || "").trim();

  if (!name && !company) {
    return { ...UNKNOWN_AI_SOURCE };
  }

  return {
    name: name || UNKNOWN_AI_SOURCE.name,
    company: company || UNKNOWN_AI_SOURCE.company,
  };
}

function sanitizeTimeSpentMin(rawValue, fallback = DEFAULT_TIME_SPENT_MIN) {
  const value = Number(rawValue);
  if (Number.isFinite(value) && value > 0) {
    return clamp(1, 240, Math.round(value));
  }
  return clamp(1, 240, Math.round(fallback));
}

function inferAddedTimelineIso(lessonHistory = [], fallbackTimestamp = isoNow()) {
  const fallbackMs = parseDateMs(fallbackTimestamp) ?? Date.now();
  const values = new Array(lessonHistory.length);
  let nextKnownMs = null;

  for (let index = lessonHistory.length - 1; index >= 0; index -= 1) {
    const entry = lessonHistory[index];
    const explicitMs = parseDateMs(entry.resultAddedAt);

    if (explicitMs !== null) {
      values[index] = explicitMs;
      nextKnownMs = explicitMs;
      continue;
    }

    if (nextKnownMs !== null) {
      const inferredMs = nextKnownMs - TIMELINE_STEP_MS;
      values[index] = inferredMs;
      nextKnownMs = inferredMs;
      continue;
    }

    const lessonMs = parseDateMs(entry.timestamp);
    const inferredMs = lessonMs ?? fallbackMs - (lessonHistory.length - index - 1) * TIMELINE_STEP_MS;
    values[index] = inferredMs;
    nextKnownMs = inferredMs;
  }

  return values.map((ms) => new Date(ms).toISOString());
}

export function hydrateLessonHistoryMetadata(lessonHistory = [], fallbackTimestamp = isoNow()) {
  const enriched = lessonHistory.map((entry) => ({
    ...entry,
    aiSource: sanitizeAiSource(entry.aiSource),
    timeSpentMin: sanitizeTimeSpentMin(entry.timeSpentMin),
  }));
  const inferredAddedAt = inferAddedTimelineIso(enriched, fallbackTimestamp);

  return enriched.map((entry, index) => ({
    ...entry,
    resultAddedAt: inferredAddedAt[index],
  }));
}

function scoreDeltaFromMistakes(mistakes, category) {
  return mistakes
    .filter((item) => item.category === category)
    .reduce((acc, item) => {
      if (item.severity === "major") {
        return acc - 10;
      }
      return acc - 5;
    }, 0);
}

function upsertVocabulary(ledger, vocabItems, mistakes, timestamp) {
  const delta = scoreDeltaFromMistakes(mistakes, "vocabulary");
  const map = new Map(ledger.map((item) => [normalizeKey(item.term), item]));

  for (const vocab of vocabItems) {
    const key = normalizeKey(vocab.term);
    const existing = map.get(key);
    const base = existing?.mastery ?? 50;
    map.set(key, {
      term: vocab.term,
      translation: vocab.translation,
      mastery: clamp(0, 100, base + 6 + delta),
      lastSeen: timestamp,
    });
  }

  return Array.from(map.values());
}

function upsertVerbs(ledger, verbs, mistakes, timestamp) {
  const delta = scoreDeltaFromMistakes(mistakes, "verb");
  const map = new Map(ledger.map((item) => [normalizeKey(item.infinitive), item]));

  for (const verb of verbs) {
    const key = normalizeKey(verb.infinitive);
    const existing = map.get(key);
    const base = existing?.mastery ?? 50;

    map.set(key, {
      infinitive: verb.infinitive,
      present: verb.present,
      mastery: clamp(0, 100, base + 7 + delta),
      lastSeen: timestamp,
    });
  }

  return Array.from(map.values());
}

function upsertGrammar(ledger, grammarItems, mistakes, timestamp) {
  const delta = scoreDeltaFromMistakes(mistakes, "grammar");
  const map = new Map(ledger.map((item) => [normalizeKey(item.id), item]));

  for (const grammar of grammarItems) {
    const key = normalizeKey(grammar.id);
    const existing = map.get(key);
    const base = existing?.mastery ?? 50;

    map.set(key, {
      id: grammar.id,
      name: grammar.name,
      example: grammar.example,
      mastery: clamp(0, 100, base + 6 + delta),
      lastSeen: timestamp,
    });
  }

  return Array.from(map.values());
}

function updateMistakePatterns(existingPatterns, mistakes, timestamp) {
  const map = new Map(existingPatterns.map((pattern) => [pattern.key, pattern]));

  for (const mistake of mistakes) {
    const existing = map.get(mistake.key);
    if (existing) {
      map.set(mistake.key, {
        ...existing,
        category: mistake.category,
        count: existing.count + 1,
        lastSeen: timestamp,
        needsPractice: existing.needsPractice || mistake.needsPractice,
      });
    } else {
      map.set(mistake.key, {
        key: mistake.key,
        category: mistake.category,
        count: 1,
        lastSeen: timestamp,
        needsPractice: mistake.needsPractice,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function applyScoreWeights(progress, nextWeights) {
  const draft = structuredClone(progress);
  draft.scoreConfig.weights = nextWeights;
  draft.lessonHistory = hydrateLessonHistoryMetadata(draft.lessonHistory, draft.updatedAt);

  const recomputed = recomputeHistoryWithWeights(draft.lessonHistory, nextWeights);
  draft.lessonHistory = recomputed.history;
  draft.scorecard = {
    overallScore: recomputed.overallScore,
    trend: recomputed.trend,
    cefrEstimate: recomputed.cefrEstimate,
  };
  draft.updatedAt = isoNow();

  return draft;
}

export function applyLessonResult(progress, lessonResult, plan) {
  if (progress.importedResultIds.includes(lessonResult.resultId)) {
    throw new DuplicateLessonResultError(lessonResult.resultId);
  }

  const importedAt = isoNow();
  const timeSpentMin = sanitizeTimeSpentMin(
    lessonResult.timeSpentMin,
    sanitizeTimeSpentMin(lessonResult.durationMin),
  );
  const aiSource = sanitizeAiSource(lessonResult.aiSource);
  const draft = structuredClone(progress);

  draft.importedResultIds.push(lessonResult.resultId);

  draft.knowledgeLedger.vocabulary = upsertVocabulary(
    draft.knowledgeLedger.vocabulary,
    lessonResult.lessonCoverage.vocabulary,
    lessonResult.mistakes,
    importedAt,
  );

  draft.knowledgeLedger.verbs = upsertVerbs(
    draft.knowledgeLedger.verbs,
    lessonResult.lessonCoverage.verbs,
    lessonResult.mistakes,
    importedAt,
  );

  draft.knowledgeLedger.grammar = upsertGrammar(
    draft.knowledgeLedger.grammar,
    lessonResult.lessonCoverage.grammar,
    lessonResult.mistakes,
    importedAt,
  );

  draft.mistakePatterns = updateMistakePatterns(
    draft.mistakePatterns,
    lessonResult.mistakes,
    importedAt,
  );

  draft.lessonHistory.push({
    resultId: lessonResult.resultId,
    timestamp: lessonResult.lessonTimestamp,
    resultAddedAt: lessonResult.resultAddedAt || importedAt,
    timeSpentMin,
    aiSource,
    moduleId: lessonResult.moduleId,
    topic: lessonResult.topic,
    factors: {
      grammar: lessonResult.scoring.grammar,
      verbs: lessonResult.scoring.verbs,
      vocabulary: lessonResult.scoring.vocabulary,
      fluency: lessonResult.scoring.fluency,
    },
    lessonScore: lessonResult.scoring.composite,
    summary: lessonResult.teacherFeedback.summary,
  });
  draft.lessonHistory = hydrateLessonHistoryMetadata(draft.lessonHistory, importedAt);

  const recomputed = recomputeHistoryWithWeights(draft.lessonHistory, draft.scoreConfig.weights);
  draft.lessonHistory = recomputed.history;
  draft.scorecard = {
    overallScore: recomputed.overallScore,
    trend: recomputed.trend,
    cefrEstimate: recomputed.cefrEstimate,
  };

  const nextModuleId = selectNextModuleId(plan, draft);
  draft.planRef.currentModuleId = nextModuleId;

  const module = (plan.modules || []).find((item) => item.moduleId === nextModuleId) || plan.modules[0];
  const selectedTopic = selectNextTopic({
    moduleTopics: module?.vocabThemes || [],
    lessonHistory: draft.lessonHistory,
    mistakePatterns: draft.mistakePatterns,
    recommendedTopic: lessonResult.recommendedNextFocus.topic,
  });

  draft.nextLesson = {
    moduleId: lessonResult.recommendedNextFocus.moduleId || nextModuleId,
    topic: selectedTopic,
    grammarFocus:
      lessonResult.recommendedNextFocus.grammar?.length
        ? lessonResult.recommendedNextFocus.grammar
        : (module?.grammarTargets || []).slice(0, 2).map((item) => item.id),
    verbFocus:
      lessonResult.recommendedNextFocus.verbs?.length
        ? lessonResult.recommendedNextFocus.verbs
        : (module?.verbTargets || []).slice(0, 2).map((item) => item.infinitive),
    vocabularyFocus:
      lessonResult.recommendedNextFocus.vocabulary?.length
        ? lessonResult.recommendedNextFocus.vocabulary
        : (module?.vocabThemes || []).slice(0, 5),
    notes: lessonResult.recommendedNextFocus.notes,
  };

  draft.updatedAt = importedAt;

  return draft;
}
