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

function topicAppearsInMistake(topic, mistakePatterns = []) {
  const lower = topic.toLowerCase();
  return mistakePatterns.some(
    (pattern) => pattern.needsPractice && String(pattern.key || "").toLowerCase().includes(lower),
  );
}

export function selectNextTopic({
  moduleTopics = [],
  lessonHistory = [],
  mistakePatterns = [],
  recommendedTopic = "",
}) {
  const pool = moduleTopics.length ? moduleTopics : IMMIGRATION_TOPIC_ROTATION;
  const recentTopics = lessonHistory.slice(-2).map((entry) => String(entry.topic || "").toLowerCase());
  const recommendedLower = String(recommendedTopic || "").toLowerCase();

  let bestTopic = pool[0] || "office";
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < pool.length; index += 1) {
    const topic = pool[index];
    const lower = topic.toLowerCase();
    let score = pool.length - index;

    const remediate = topicAppearsInMistake(topic, mistakePatterns);
    if (recommendedLower && lower === recommendedLower) {
      score += 50;
    }
    if (remediate) {
      score += 30;
    }

    if (recentTopics.includes(lower) && !remediate && lower !== recommendedLower) {
      score -= 100;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestTopic;
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

  const recentCurrent = (progress?.lessonHistory || [])
    .filter((entry) => entry.moduleId === currentId)
    .slice(-2);

  const currentAverage =
    recentCurrent.length > 0
      ? recentCurrent.reduce((acc, entry) => acc + Number(entry.lessonScore || 0), 0) / recentCurrent.length
      : 0;

  const hasActiveWeakness = (progress?.mistakePatterns || []).some((pattern) => pattern.needsPractice);

  if (recentCurrent.length >= 2 && currentAverage >= 70 && !hasActiveWeakness) {
    return modules[Math.min(currentIndex + 1, modules.length - 1)].moduleId;
  }

  return currentId;
}
