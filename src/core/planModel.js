import { uniqStrings } from "./normalizers.js";

export function normalizeTopicToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, " ");
}

function slugifyTopic(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  return slug || "topic";
}

function topicAliases(topic = {}) {
  return uniqStrings(
    [topic.label, ...(Array.isArray(topic.aliases) ? topic.aliases : [])]
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  );
}

function sanitizeStructuredTopic(topic = {}, moduleId = "", index = 0) {
  const label = String(topic.label || topic.name || "").trim();
  if (!label) {
    return null;
  }
  const fallbackId = `${moduleId || "module"}-${slugifyTopic(label)}-${String(index + 1).padStart(2, "0")}`;
  const id = String(topic.id || fallbackId).trim();
  return {
    id: id || fallbackId,
    label,
    aliases: topicAliases({ ...topic, label }),
  };
}

function buildLegacyTopics(module = {}, fallbackTopics = []) {
  const moduleId = String(module?.moduleId || "module");
  const labels = uniqStrings(
    [...(Array.isArray(module?.vocabThemes) ? module.vocabThemes : []), ...fallbackTopics]
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  );

  const usedIds = new Set();
  return labels.map((label, index) => {
    const baseId = `${moduleId}-${slugifyTopic(label)}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    return {
      id,
      label,
      aliases: [label],
    };
  });
}

export function getModuleTopicEntries(module = {}, fallbackTopics = []) {
  const moduleId = String(module?.moduleId || "module");
  const structured = Array.isArray(module?.topics) ? module.topics : [];
  if (structured.length) {
    const usedIds = new Set();
    const entries = [];
    for (let index = 0; index < structured.length; index += 1) {
      const sanitized = sanitizeStructuredTopic(structured[index], moduleId, index);
      if (!sanitized) {
        continue;
      }
      let id = sanitized.id;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${sanitized.id}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(id);
      entries.push({
        id,
        label: sanitized.label,
        aliases: sanitized.aliases,
      });
    }
    if (entries.length) {
      return entries;
    }
  }
  return buildLegacyTopics(module, fallbackTopics);
}

export function getModuleTopicLabels(module = {}, fallbackTopics = []) {
  return getModuleTopicEntries(module, fallbackTopics).map((entry) => entry.label);
}

export function topicCandidates(entry = {}) {
  return uniqStrings([entry.id, entry.label, ...(entry.aliases || [])]);
}

export function topicMatchesEntry(entry = {}, value = "") {
  const token = normalizeTopicToken(value);
  if (!token) {
    return false;
  }
  return topicCandidates(entry).some((candidate) => normalizeTopicToken(candidate) === token);
}

export function findTopicEntry(entries = [], value = "") {
  if (!entries.length) {
    return null;
  }
  for (const entry of entries) {
    if (topicMatchesEntry(entry, value)) {
      return entry;
    }
  }
  return null;
}

export function resolveTopicLabel(module = {}, value = "", fallbackTopics = []) {
  const entries = getModuleTopicEntries(module, fallbackTopics);
  const match = findTopicEntry(entries, value);
  if (match) {
    return match.label;
  }
  return String(value || "").trim();
}
