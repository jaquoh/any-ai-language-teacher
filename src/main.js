import "./styles.css";
import validLessonResultSample from "../examples/lesson-result.valid.sample.json";
import invalidLessonResultSample from "../examples/lesson-result.invalid.sample.json";
import confetti from "canvas-confetti";

import { getCurrentRoute } from "./ui/router.js";
import { renderShell } from "./ui/components/layout.js";
import { renderDashboard, bindDashboardEvents } from "./ui/pages/dashboard.js";
import { renderPromptBuilder, bindPromptBuilderEvents } from "./ui/pages/prompt-builder.js";
import { renderImportResult, bindImportResultEvents } from "./ui/pages/import-result.js";
import { renderLessons } from "./ui/pages/lessons.js";
import { renderKnowledge, bindKnowledgeEvents } from "./ui/pages/knowledge.js";
import { renderPlan } from "./ui/pages/plan.js";
import { renderSettings, bindSettingsEvents } from "./ui/pages/settings.js";
import { renderAbout } from "./ui/pages/about.js";

import { getState, subscribe, updateState, resetToSample } from "./state/store.js";
import { DEFAULT_WEIGHTS, normalizeWeights } from "./core/scoringEngine.js";
import { applyScoreWeights, hydrateLessonHistoryAiSource } from "./core/progressUpdater.js";
import { buildNextLessonPacket, renderNextLessonPrompt } from "./core/promptGenerator.js";
import { importLessonResult } from "./core/importEngine.js";
import { speakText } from "./core/speech.js";
import { getCurrentTheme, initTheme, toggleTheme } from "./core/theme.js";
import { validateBySchema } from "./core/validator.js";

const root = document.querySelector("#app");

function celebrateImportSuccess() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const defaults = {
      spread: 70,
      ticks: 220,
      gravity: 0.95,
      origin: { y: 0.72 },
    };

    confetti({
      ...defaults,
      particleCount: 90,
      scalar: 1.05,
      colors: ["#e11d48", "#fb7185", "#f43f5e", "#f59e0b", "#10b981"],
    });

    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 70,
        scalar: 0.9,
        angle: 120,
      });
      confetti({
        ...defaults,
        particleCount: 70,
        scalar: 0.9,
        angle: 60,
      });
    }, 190);
  } catch (_) {
    // Non-blocking visual effect.
  }
}

function notify(message, ok = true) {
  updateState({
    importStatus: {
      ok,
      message,
      errors: [],
    },
  });
}

async function copyText(content) {
  if (!content) {
    return false;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return true;
  }

  return false;
}

const actions = {
  onScoreWeightsChange(nextRawWeights) {
    const state = getState();
    const normalized = normalizeWeights(nextRawWeights);
    const updatedProgress = applyScoreWeights(state.progress, normalized);
    updateState({ progress: updatedProgress });
  },

  onScoreWeightsReset() {
    const state = getState();
    const updatedProgress = applyScoreWeights(state.progress, DEFAULT_WEIGHTS);
    updateState({ progress: updatedProgress });
  },

  onGeneratePrompt() {
    const state = getState();
    const packet = buildNextLessonPacket(state.progress, state.plan);
    const validation = validateBySchema("nextLessonPacket", packet);

    if (!validation.valid) {
      updateState({
        importStatus: {
          ok: false,
          message: "Generated packet failed schema validation.",
          errors: validation.errors,
        },
      });
      return;
    }

    const promptText = renderNextLessonPrompt(packet);
    updateState({ promptText });
  },

  async onCopyPrompt() {
    const success = await copyText(getState().promptText);
    notify(success ? "Prompt copied to clipboard." : "Could not copy prompt automatically.", success);
  },

  onImportResult(input) {
    const state = getState();
    const report = importLessonResult({
      rawInput: input,
      progress: state.progress,
      plan: state.plan,
    });

    if (!report.ok) {
      updateState({
        importStatus: {
          ok: false,
          message: "Import failed. Use the repair prompt to regenerate valid JSON.",
          errors: report.errors,
        },
        repairPrompt: report.repairPrompt,
      });
      return;
    }

    updateState({
      progress: report.updatedProgress,
      repairPrompt: "",
      importStatus: {
        ok: true,
        message: "Lesson result imported. Great work, keep the streak going.",
        errors: [],
      },
    });

    celebrateImportSuccess();
  },

  onLoadSample(valid = true) {
    const payload = valid ? validLessonResultSample : invalidLessonResultSample;
    const textArea = document.querySelector("#result-input");
    if (textArea) {
      textArea.value = JSON.stringify(payload, null, 2);
    }
  },

  async onCopyRepairPrompt() {
    const success = await copyText(getState().repairPrompt);
    notify(success ? "Repair prompt copied." : "Could not copy repair prompt.", success);
  },

  onExportProgress() {
    const progressText = JSON.stringify(getState().progress, null, 2);
    const blob = new Blob([progressText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${getState().progress.projectId}.progress.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  },

  onImportProgressFile(event) {
    const file = event?.target?.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || "{}"));
        const normalizedPayload =
          payload && typeof payload === "object"
            ? {
                ...payload,
                lessonHistory: hydrateLessonHistoryAiSource(payload.lessonHistory),
              }
            : payload;
        const validation = validateBySchema("progressData", normalizedPayload);

        if (!validation.valid) {
          updateState({
            importStatus: {
              ok: false,
              message: "ProgressData import failed schema validation.",
              errors: validation.errors,
            },
          });
          return;
        }

        updateState({ progress: normalizedPayload, importStatus: null, repairPrompt: "" });
      } catch (error) {
        updateState({
          importStatus: {
            ok: false,
            message: `Could not parse ProgressData: ${error.message}`,
            errors: [{ path: "/", keyword: "parse", message: error.message }],
          },
        });
      }
    };

    reader.readAsText(file);
  },

  onResetProject() {
    resetToSample();
  },

  onSpeakText(text, targetLang) {
    const result = speakText(text, { targetLang });
    if (!result.ok) {
      window.alert("Speech synthesis is not available in this browser context.");
    }
  },
};

function renderRouteContent(route, state) {
  switch (route) {
    case "promptBuilder":
      return {
        html: renderPromptBuilder(state),
        bind: (container) => bindPromptBuilderEvents(container, actions),
      };
    case "importResult":
      return {
        html: renderImportResult(state),
        bind: (container) => bindImportResultEvents(container, actions),
      };
    case "lessons":
      return { html: renderLessons(state), bind: null };
    case "knowledge":
      return {
        html: renderKnowledge(state),
        bind: (container) => bindKnowledgeEvents(container, actions),
      };
    case "plan":
      return { html: renderPlan(state), bind: null };
    case "settings":
      return {
        html: renderSettings(state),
        bind: (container) => bindSettingsEvents(container, state, actions),
      };
    case "about":
      return { html: renderAbout(state), bind: null };
    case "dashboard":
    default:
      return {
        html: renderDashboard(state),
        bind: (container) => bindDashboardEvents(container, state, actions),
      };
  }
}

function renderApp() {
  const state = getState();
  const route = getCurrentRoute();
  const page = renderRouteContent(route, state);
  root.innerHTML = renderShell(route, page.html, getCurrentTheme() === "dark");
  if (page.bind) {
    page.bind(root);
  }
  bindShellEvents();
}

function bindShellEvents() {
  const themeButton = root.querySelector("#theme-toggle");
  themeButton?.addEventListener("click", () => {
    const theme = toggleTheme();
    themeButton.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    themeButton.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  });
}

window.addEventListener("hashchange", renderApp);
initTheme();
subscribe(renderApp);
renderApp();
