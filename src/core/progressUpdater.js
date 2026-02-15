import { clamp, isoNow, normalizeKey } from "./normalizers.js";
import { recomputeHistoryWithWeights } from "./scoringEngine.js";
import {
  buildDefaultFocusForTopic,
  resolveModuleCadence,
  selectNextModuleId,
  selectNextTopic,
  shouldSkipGrammarForTopic,
} from "./topicSelector.js";
import { getModuleTopicLabels } from "./planModel.js";

const UNKNOWN_AI_SOURCE = {
  model: "unknown",
  company: "unknown",
};

export class DuplicateLessonResultError extends Error {
  constructor(resultId) {
    super(`Lesson result already imported: ${resultId}`);
    this.name = "DuplicateLessonResultError";
  }
}

function sanitizeAiSource(aiSource) {
  const model = String(aiSource?.model || aiSource?.name || "").trim();
  const company = String(aiSource?.company || "").trim();

  if (!model && !company) {
    return { ...UNKNOWN_AI_SOURCE };
  }

  return {
    model: model || UNKNOWN_AI_SOURCE.model,
    company: company || UNKNOWN_AI_SOURCE.company,
  };
}

function sanitizeDurationMin(durationMin) {
  const value = Number(durationMin);
  if (Number.isInteger(value) && value > 0 && value <= 240) {
    return value;
  }
  return null;
}

export function hydrateLessonHistoryAiSource(lessonHistory = []) {
  return lessonHistory.map((entry) => {
    const { timeSpentMin: _timeSpentMin, resultAddedAt: _resultAddedAt, ...rest } = entry;
    const durationMin = sanitizeDurationMin(entry.durationMin);
    return {
      ...rest,
      ...(durationMin ? { durationMin } : {}),
      aiSource: sanitizeAiSource(entry.aiSource),
    };
  });
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
  draft.lessonHistory = hydrateLessonHistoryAiSource(draft.lessonHistory);

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
  const aiSource = sanitizeAiSource(lessonResult.aiSource);
  const durationMin = sanitizeDurationMin(lessonResult.durationMin);
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
    ...(durationMin ? { durationMin } : {}),
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
  draft.lessonHistory = hydrateLessonHistoryAiSource(draft.lessonHistory);

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
  const moduleTopics = getModuleTopicLabels(module);
  const selectedTopic = selectNextTopic({
    module,
    moduleId: nextModuleId,
    moduleTopics,
    lessonHistory: draft.lessonHistory,
    mistakePatterns: draft.mistakePatterns,
    recommendedTopic: lessonResult.recommendedNextFocus.topic,
    lessonsPerTopic: resolveModuleCadence(module, moduleTopics.length).lessonsPerTopic,
  });
  const defaultFocus = buildDefaultFocusForTopic({ module, topic: selectedTopic });
  const skipGrammar = shouldSkipGrammarForTopic({
    module,
    moduleId: nextModuleId,
    topic: selectedTopic,
    lessonHistory: draft.lessonHistory,
  });

  draft.nextLesson = {
    moduleId: nextModuleId,
    topic: selectedTopic,
    grammarFocus:
      skipGrammar
        ? []
        : lessonResult.recommendedNextFocus.grammar?.length
        ? lessonResult.recommendedNextFocus.grammar
        : defaultFocus.grammarFocus,
    verbFocus:
      lessonResult.recommendedNextFocus.verbs?.length
        ? lessonResult.recommendedNextFocus.verbs
        : defaultFocus.verbFocus,
    vocabularyFocus:
      lessonResult.recommendedNextFocus.vocabulary?.length
        ? lessonResult.recommendedNextFocus.vocabulary
        : defaultFocus.vocabularyFocus,
    notes: lessonResult.recommendedNextFocus.notes,
  };

  draft.updatedAt = importedAt;

  return draft;
}
