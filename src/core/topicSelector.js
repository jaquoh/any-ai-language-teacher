import { uniqStrings } from "./normalizers.js";

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
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, " ");
}

function asPositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function normalizePool(moduleTopics = []) {
  return uniqStrings(moduleTopics.map((topic) => String(topic || "").trim()).filter(Boolean));
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

function buildTopicCounts({ moduleId = "", moduleTopics = [], lessonHistory = [] }) {
  const map = new Map(moduleTopics.map((topic) => [normalizeTopic(topic), 0]));

  for (const entry of lessonHistory) {
    if (moduleId && entry.moduleId !== moduleId) {
      continue;
    }
    const key = normalizeTopic(entry.topic);
    if (!map.has(key)) {
      continue;
    }
    map.set(key, (map.get(key) || 0) + 1);
  }

  return map;
}

export function getTopicIndex(moduleTopics = [], topic = "") {
  const normalized = normalizeTopic(topic);
  if (!normalized) {
    return 0;
  }
  const pool = normalizePool(moduleTopics);
  if (!pool.length) {
    return 0;
  }
  const index = pool.findIndex((item) => normalizeTopic(item) === normalized);
  return index === -1 ? 0 : index;
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
  const topics = normalizePool(module?.vocabThemes || []);
  const topicIndex = getTopicIndex(topics, topic);

  const vocabularyFocus = uniqStrings([
    topic,
    ...circularSlice(topics, topicIndex, Math.min(5, topics.length)),
  ]).slice(0, 5);

  const verbTargets = uniqStrings((module?.verbTargets || []).map((item) => item.infinitive).filter(Boolean));
  const verbsPerTopic = topics.length ? Math.max(2, Math.floor(verbTargets.length / topics.length)) : 2;
  const verbStart = topicIndex * verbsPerTopic;
  const verbFocus = uniqStrings([
    ...verbTargets.slice(verbStart, verbStart + verbsPerTopic),
    ...circularSlice(verbTargets, 0, 2),
  ]).slice(0, Math.max(2, verbsPerTopic));

  const grammarTargets = uniqStrings((module?.grammarTargets || []).map((item) => item.id).filter(Boolean));
  const grammarFocus = grammarTargets.length ? [grammarTargets[topicIndex % grammarTargets.length]] : [];

  return {
    grammarFocus,
    verbFocus,
    vocabularyFocus,
  };
}

export function topicPracticeCount({ moduleId = "", topic = "", lessonHistory = [] }) {
  const normalized = normalizeTopic(topic);
  if (!normalized) {
    return 0;
  }

  return lessonHistory.reduce((count, entry) => {
    if (moduleId && entry.moduleId !== moduleId) {
      return count;
    }
    return normalizeTopic(entry.topic) === normalized ? count + 1 : count;
  }, 0);
}

export function shouldSkipGrammarForTopic({
  module = {},
  moduleId = "",
  topic = "",
  lessonHistory = [],
}) {
  const lessonsPerTopic = resolveModuleCadence(module, normalizePool(module?.vocabThemes || []).length).lessonsPerTopic;
  if (lessonsPerTopic <= 1) {
    return false;
  }

  const practiced = topicPracticeCount({ moduleId, topic, lessonHistory });
  return practiced > 0 && practiced % 2 === 1;
}

function topicAppearsInMistake(topic, mistakePatterns = []) {
  const lower = topic.toLowerCase();
  return mistakePatterns.some(
    (pattern) => pattern.needsPractice && String(pattern.key || "").toLowerCase().includes(lower),
  );
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
  const pool = normalizePool(moduleTopics).length ? normalizePool(moduleTopics) : IMMIGRATION_TOPIC_ROTATION;
  const resolvedModuleId = moduleId || module?.moduleId || "";
  const resolvedLessonsPerTopic =
    asPositiveInt(lessonsPerTopic) || resolveModuleCadence(module || {}, pool.length).lessonsPerTopic;
  const topicCounts = buildTopicCounts({
    moduleId: resolvedModuleId,
    moduleTopics: pool,
    lessonHistory,
  });
  const underTarget = pool.filter(
    (topic) => (topicCounts.get(normalizeTopic(topic)) || 0) < resolvedLessonsPerTopic,
  );
  const candidatePool = underTarget.length ? underTarget : pool;
  const recentTopics = lessonHistory.slice(-2).map((entry) => String(entry.topic || "").toLowerCase());
  const recommendedLower = String(recommendedTopic || "").toLowerCase();

  let bestTopic = candidatePool[0] || pool[0] || "office";
  let bestScore = Number.NEGATIVE_INFINITY;

  const maxCount = pool.reduce(
    (max, topic) => Math.max(max, topicCounts.get(normalizeTopic(topic)) || 0),
    0,
  );

  for (const topic of candidatePool) {
    const lower = topic.toLowerCase();
    const topicCount = topicCounts.get(normalizeTopic(topic)) || 0;
    const index = pool.findIndex((item) => item === topic);
    let score = (maxCount - topicCount) * 6 + (pool.length - index) * 0.01;
    if (topicCount < resolvedLessonsPerTopic) {
      score += 40;
    }

    const remediate = topicAppearsInMistake(topic, mistakePatterns);
    if (recommendedLower && lower === recommendedLower) {
      score += 50;
    }
    if (remediate) {
      score += 30;
    }

    if (
      candidatePool.length > 1 &&
      recentTopics.includes(lower) &&
      !remediate &&
      lower !== recommendedLower
    ) {
      score -= 100;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestTopic;
}

export function summarizeModuleProgress(module, lessonHistory = []) {
  const topics = normalizePool(module?.vocabThemes || []);
  const cadence = resolveModuleCadence(module, topics.length);
  const topicCounts = buildTopicCounts({
    moduleId: module?.moduleId || "",
    moduleTopics: topics,
    lessonHistory,
  });
  const moduleLessons = lessonHistory.filter((entry) => entry.moduleId === module?.moduleId).length;
  const targetTopicLessons = topics.length * cadence.lessonsPerTopic;
  const completedTopicLessons = topics.reduce(
    (acc, topic) => acc + Math.min(topicCounts.get(normalizeTopic(topic)) || 0, cadence.lessonsPerTopic),
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
