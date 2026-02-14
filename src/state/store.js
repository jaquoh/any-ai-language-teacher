import sampleProgress from "../../examples/progress-data.sample.json";
import germanPlan from "../../data/learning-plan/de/german-a1-b1.v1.json";

const state = {
  plan: structuredClone(germanPlan),
  progress: structuredClone(sampleProgress),
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
  for (const listener of listeners) {
    listener(state);
  }
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetToSample() {
  state.progress = structuredClone(sampleProgress);
  state.importStatus = null;
  state.repairPrompt = "";
  for (const listener of listeners) {
    listener(state);
  }
}
