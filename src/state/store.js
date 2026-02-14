import sampleProgress from "../../examples/progress-data.sample.json";
import germanPlan from "../../data/learning-plan/de/german-a1-b1.v1.json";
import { hydrateLessonHistoryAiSource } from "../core/progressUpdater.js";
import { validateBySchema } from "../core/validator.js";

const PROGRESS_STORAGE_KEY = "any-ai-teacher.progressData.v1";

function getStorage() {
  const storage = globalThis?.localStorage;
  if (
    !storage ||
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function" ||
    typeof storage.removeItem !== "function"
  ) {
    return null;
  }
  return storage;
}

function clearStoredProgress(storage) {
  try {
    storage.removeItem(PROGRESS_STORAGE_KEY);
  } catch (_) {
    // Ignore storage removal failures.
  }
}

function readStoredProgress() {
  const storage = getStorage();
  if (!storage) {
    return normalizeProgressMetadata(structuredClone(sampleProgress));
  }

  try {
    const raw = storage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      return normalizeProgressMetadata(structuredClone(sampleProgress));
    }

    const parsed = normalizeProgressMetadata(JSON.parse(raw));
    const validation = validateBySchema("progressData", parsed);

    if (!validation.valid) {
      clearStoredProgress(storage);
      return normalizeProgressMetadata(structuredClone(sampleProgress));
    }

    return parsed;
  } catch (_) {
    clearStoredProgress(storage);
    return normalizeProgressMetadata(structuredClone(sampleProgress));
  }
}

function normalizeProgressMetadata(progress) {
  const draft = structuredClone(progress);
  draft.lessonHistory = hydrateLessonHistoryAiSource(draft.lessonHistory);
  return draft;
}

function persistProgress(progress) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (_) {
    // Persistence failures should never block app usage.
  }
}

function emitState() {
  for (const listener of listeners) {
    listener(state);
  }
}

const state = {
  plan: structuredClone(germanPlan),
  progress: readStoredProgress(),
  promptText: "",
  importStatus: null,
  repairPrompt: "",
};

const listeners = new Set();

export function getState() {
  return state;
}

export function updateState(patch) {
  Object.assign(state, patch);
  if (Object.prototype.hasOwnProperty.call(patch, "progress")) {
    state.progress = normalizeProgressMetadata(state.progress);
    persistProgress(state.progress);
  }
  emitState();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetToSample() {
  state.progress = normalizeProgressMetadata(structuredClone(sampleProgress));
  state.importStatus = null;
  state.repairPrompt = "";
  persistProgress(state.progress);
  emitState();
}
