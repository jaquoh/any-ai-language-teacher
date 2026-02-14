import { afterEach, describe, expect, it, vi } from "vitest";

import sampleProgress from "../../examples/progress-data.sample.json";

const STORAGE_KEY = "any-ai-teacher.progressData.v1";

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

async function loadStoreModule() {
  vi.resetModules();
  return import("../../src/state/store.js");
}

afterEach(() => {
  delete globalThis.localStorage;
});

describe("state store local persistence", () => {
  it("loads progress from localStorage when schema-valid", async () => {
    const stored = structuredClone(sampleProgress);
    stored.planRef.currentModuleId = "de_a2_conversation";
    globalThis.localStorage = createStorage({
      [STORAGE_KEY]: JSON.stringify(stored),
    });

    const { getState } = await loadStoreModule();

    expect(getState().progress.planRef.currentModuleId).toBe("de_a2_conversation");
  });

  it("falls back to sample and clears malformed localStorage data", async () => {
    const storage = createStorage({
      [STORAGE_KEY]: "{ this is not json",
    });
    globalThis.localStorage = storage;

    const { getState } = await loadStoreModule();

    expect(getState().progress.projectId).toBe(sampleProgress.projectId);
    expect(storage.getItem(STORAGE_KEY)).toBe(null);
  });

  it("persists progress when updateState receives a progress patch", async () => {
    const storage = createStorage();
    globalThis.localStorage = storage;
    const { updateState } = await loadStoreModule();

    const nextProgress = structuredClone(sampleProgress);
    nextProgress.planRef.currentModuleId = "de_b1_work_scenarios";
    updateState({ progress: nextProgress });

    const stored = JSON.parse(storage.getItem(STORAGE_KEY));
    expect(stored.planRef.currentModuleId).toBe("de_b1_work_scenarios");
  });

  it("persists sample progress when resetToSample is triggered", async () => {
    const stored = structuredClone(sampleProgress);
    stored.planRef.currentModuleId = "de_b1_work_scenarios";
    const storage = createStorage({
      [STORAGE_KEY]: JSON.stringify(stored),
    });
    globalThis.localStorage = storage;

    const { resetToSample } = await loadStoreModule();
    resetToSample();

    const current = JSON.parse(storage.getItem(STORAGE_KEY));
    expect(current.planRef.currentModuleId).toBe(sampleProgress.planRef.currentModuleId);
  });
});
