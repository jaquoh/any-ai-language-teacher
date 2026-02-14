import { getModuleTopicEntries, getModuleTopicLabels, findTopicEntry, normalizeTopicToken } from "./planModel.js";

export const IMMIGRATION_TOPIC_ROTATION = [
  "office",
  "vacation",
  "relationship",
  "supermarket",
  "public transportation",
  "job search",
  "friends",
  "activities",
  "animals",
  "business",
];

export function normalizeTopic(value) {
  return normalizeTopicToken(value);
}

function asPositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function buildTopicPool({ module = null, moduleTopics = [] }) {
  const fallbackModule = {
    moduleId: module?.moduleId || "fallback",
    vocabThemes: moduleTopics.length ? moduleTopics : IMMIGRATION_TOPIC_ROTATION,
  };
  const entries = getModuleTopicEntries(module || fallbackModule, fallbackModule.vocabThemes);
  return entries.length ? entries : getModuleTopicEntries(fallbackModule, fallbackModule.vocabThemes);
}

export function resolveModuleCadence(module = {}, moduleTopicCount = 0) {
  const targetLessons = asPositiveInt(module?.lessonCadence?.targetLessons);
  const lessonsPerTopic = asPositiveInt(module?.lessonCadence?.lessonsPerTopic);
  const fallbackTarget = Math.max(moduleTopicCount * 2, 12);
  const fallbackPerTopic = moduleTopicCount ? Math.max(1, Math.ceil(fallbackTarget / moduleTopicCount)) : 1;
  const resolvedPerTopic = lessonsPerTopic || fallbackPerTopic;
  const minTopicLessons = moduleTopicCount * resolvedPerTopic;

  return {
    targetLessons: Math.max(targetLessons || fallbackTarget, minTopicLessons),
    lessonsPerTopic: resolvedPerTopic,
  };
}

function buildTopicCounts({ moduleId = "", topicEntries = [], lessonHistory = [] }) {
  const map = new Map(topicEntries.map((entry) => [entry.id, 0]));

  for (const historyEntry of lessonHistory) {
    if (moduleId && historyEntry.moduleId !== moduleId) {
      continue;
    }
    const matchedEntry = findTopicEntry(topicEntries, historyEntry.topic);
    if (!matchedEntry) {
      continue;
    }
    map.set(matchedEntry.id, (map.get(matchedEntry.id) || 0) + 1);
  }

  return map;
}

export function getTopicIndex(moduleTopics = [], topic = "", module = null) {
  const topicEntries = buildTopicPool({ module, moduleTopics });
  const matched = findTopicEntry(topicEntries, topic);
  if (!matched) {
    return 0;
  }
  return topicEntries.findIndex((entry) => entry.id === matched.id);
}

function circularSlice(items = [], start = 0, count = 0) {
  if (!items.length || count <= 0) {
    return [];
  }
  const results = [];
  for (let step = 0; step < count; step += 1) {
    results.push(items[(start + step) % items.length]);
  }
  return results;
}

export function buildDefaultFocusForTopic({ module = {}, topic = "" }) {
  const topics = getModuleTopicLabels(module);
  const topicIndex = getTopicIndex(topics, topic, module);

  const vocabularyFocus = [topic, ...circularSlice(topics, topicIndex, Math.min(5, topics.length))]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, array) => array.findIndex((item) => normalizeTopic(item) === normalizeTopic(value)) === index)
    .slice(0, 5);

  const verbTargets = (module?.verbTargets || [])
    .map((item) => item.infinitive)
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
  const verbsPerTopic = topics.length ? Math.max(2, Math.floor(verbTargets.length / topics.length)) : 2;
  const verbStart = topicIndex * verbsPerTopic;
  const verbFocus = [...verbTargets.slice(verbStart, verbStart + verbsPerTopic), ...circularSlice(verbTargets, 0, 2)]
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, Math.max(2, verbsPerTopic));

  const grammarTargets = (module?.grammarTargets || [])
    .map((item) => item.id)
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
  const grammarFocus = grammarTargets.length ? [grammarTargets[topicIndex % grammarTargets.length]] : [];

  return {
    grammarFocus,
    verbFocus,
    vocabularyFocus,
  };
}

export function topicPracticeCount({ module = {}, moduleId = "", topic = "", lessonHistory = [] }) {
  const topicEntries = buildTopicPool({ module, moduleTopics: getModuleTopicLabels(module) });
  const matchedTarget = findTopicEntry(topicEntries, topic);
  if (!matchedTarget) {
    return 0;
  }

  return lessonHistory.reduce((count, historyEntry) => {
    if (moduleId && historyEntry.moduleId !== moduleId) {
      return count;
    }
    const matchedHistoryTopic = findTopicEntry(topicEntries, historyEntry.topic);
    if (!matchedHistoryTopic) {
      return count;
    }
    return matchedHistoryTopic.id === matchedTarget.id ? count + 1 : count;
  }, 0);
}

export function shouldSkipGrammarForTopic({
  module = {},
  moduleId = "",
  topic = "",
  lessonHistory = [],
}) {
  const lessonsPerTopic = resolveModuleCadence(module, getModuleTopicLabels(module).length).lessonsPerTopic;
  if (lessonsPerTopic <= 1) {
    return false;
  }

  const practiced = topicPracticeCount({ module, moduleId, topic, lessonHistory });
  return practiced > 0 && practiced % 2 === 1;
}

function topicAppearsInMistake(topicEntry, mistakePatterns = []) {
  const candidates = [topicEntry.label, ...(topicEntry.aliases || [])]
    .map((value) => normalizeTopic(value))
    .filter(Boolean);

  return mistakePatterns.some((pattern) => {
    if (!pattern.needsPractice) {
      return false;
    }
    const key = normalizeTopic(pattern.key || "");
    return candidates.some((candidate) => key.includes(candidate));
  });
}

export function selectNextTopic({
  module = null,
  moduleId = "",
  moduleTopics = [],
  lessonHistory = [],
  mistakePatterns = [],
  recommendedTopic = "",
  lessonsPerTopic = null,
}) {
  const topicEntries = buildTopicPool({ module, moduleTopics });
  const resolvedModuleId = moduleId || module?.moduleId || "";
  const resolvedLessonsPerTopic =
    asPositiveInt(lessonsPerTopic) || resolveModuleCadence(module || {}, topicEntries.length).lessonsPerTopic;
  const topicCounts = buildTopicCounts({
    moduleId: resolvedModuleId,
    topicEntries,
    lessonHistory,
  });
  const underTarget = topicEntries.filter(
    (entry) => (topicCounts.get(entry.id) || 0) < resolvedLessonsPerTopic,
  );
  const candidatePool = underTarget.length ? underTarget : topicEntries;
  const recentTopicIds = lessonHistory
    .slice(-2)
    .map((entry) => findTopicEntry(topicEntries, entry.topic))
    .filter(Boolean)
    .map((entry) => entry.id);
  const recommendedEntry = findTopicEntry(topicEntries, recommendedTopic);
  const recommendedId = recommendedEntry?.id || "";

  let bestTopic = candidatePool[0] || topicEntries[0] || { id: "office", label: "office", aliases: [] };
  let bestScore = Number.NEGATIVE_INFINITY;

  const maxCount = topicEntries.reduce(
    (max, entry) => Math.max(max, topicCounts.get(entry.id) || 0),
    0,
  );

  for (const entry of candidatePool) {
    const topicCount = topicCounts.get(entry.id) || 0;
    const index = topicEntries.findIndex((item) => item.id === entry.id);
    let score = (maxCount - topicCount) * 6 + (topicEntries.length - index) * 0.01;
    if (topicCount < resolvedLessonsPerTopic) {
      score += 40;
    }

    const remediate = topicAppearsInMistake(entry, mistakePatterns);
    if (recommendedId && entry.id === recommendedId) {
      score += 50;
    }
    if (remediate) {
      score += 30;
    }

    if (
      candidatePool.length > 1 &&
      recentTopicIds.includes(entry.id) &&
      !remediate &&
      entry.id !== recommendedId
    ) {
      score -= 100;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTopic = entry;
    }
  }

  return bestTopic.label;
}

export function summarizeModuleProgress(module, lessonHistory = []) {
  const topicEntries = getModuleTopicEntries(module, IMMIGRATION_TOPIC_ROTATION);
  const cadence = resolveModuleCadence(module, topicEntries.length);
  const topicCounts = buildTopicCounts({
    moduleId: module?.moduleId || "",
    topicEntries,
    lessonHistory,
  });
  const moduleLessons = lessonHistory.filter((entry) => entry.moduleId === module?.moduleId).length;
  const targetTopicLessons = topicEntries.length * cadence.lessonsPerTopic;
  const completedTopicLessons = topicEntries.reduce(
    (acc, entry) => acc + Math.min(topicCounts.get(entry.id) || 0, cadence.lessonsPerTopic),
    0,
  );
  const topicCoverageComplete =
    targetTopicLessons === 0
      ? moduleLessons >= cadence.targetLessons
      : completedTopicLessons >= targetTopicLessons;
  const moduleComplete = moduleLessons >= cadence.targetLessons && topicCoverageComplete;

  return {
    lessonsCompleted: moduleLessons,
    targetLessons: cadence.targetLessons,
    lessonsPerTopic: cadence.lessonsPerTopic,
    completedTopicLessons,
    targetTopicLessons,
    topicCoverageComplete,
    moduleComplete,
  };
}

export function selectNextModuleId(plan, progress) {
  const modules = [...(plan?.modules || [])].sort((a, b) => a.order - b.order);
  if (!modules.length) {
    return progress?.planRef?.currentModuleId || "";
  }

  const currentId = progress?.planRef?.currentModuleId || modules[0].moduleId;
  const currentIndex = modules.findIndex((module) => module.moduleId === currentId);

  if (currentIndex === -1) {
    return modules[0].moduleId;
  }

  const summary = summarizeModuleProgress(modules[currentIndex], progress?.lessonHistory || []);
  if (summary.moduleComplete) {
    return modules[Math.min(currentIndex + 1, modules.length - 1)].moduleId;
  }

  return currentId;
}
