import "./styles.css";
import "preline";
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
let isCoreLoopCollapsed = false;
let coreLoopFeedback = null;

function setCoreLoopFeedback(message, ok = true) {
  coreLoopFeedback = {
    message,
    ok,
    at: Date.now(),
  };
}

function emptyLessonLoop() {
  return {
    promptReady: false,
    lessonDone: false,
    resultImported: false,
    lastCompletedAt: null,
  };
}

function isLessonLoopComplete(loopState) {
  return Boolean(loopState?.promptReady && loopState?.lessonDone && loopState?.resultImported);
}

function celebrateLoopSuccess() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    confetti({
      spread: 95,
      ticks: 260,
      gravity: 0.9,
      scalar: 1.1,
      particleCount: 130,
      origin: { y: 0.65 },
      colors: ["#22c55e", "#16a34a", "#4ade80", "#f59e0b", "#d82960"],
    });
  } catch (_) {
    // Non-blocking visual effect.
  }
}

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
    setCoreLoopFeedback("Prompt step completed.", true);
    updateState({
      promptText,
      lessonLoop: {
        ...emptyLessonLoop(),
        promptReady: true,
      },
    });
  },

  async onCopyPrompt() {
    return copyText(getState().promptText);
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

    const nextLessonLoop = {
      ...state.lessonLoop,
      promptReady: true,
      lessonDone: true,
      resultImported: true,
    };

    if (isLessonLoopComplete(nextLessonLoop)) {
      nextLessonLoop.lastCompletedAt = new Date().toISOString();
    }

    setCoreLoopFeedback(
      isLessonLoopComplete(nextLessonLoop)
        ? "Great loop completion. Start the next lesson by generating a fresh prompt."
        : "Import step completed.",
      true,
    );
    updateState({
      progress: report.updatedProgress,
      repairPrompt: "",
      lessonLoop: nextLessonLoop,
      importStatus: {
        ok: true,
        message: "Lesson result imported. Great work, keep the streak going.",
        errors: [],
      },
    });

    celebrateImportSuccess();
    if (isLessonLoopComplete(nextLessonLoop) && !state.lessonLoop?.lastCompletedAt) {
      celebrateLoopSuccess();
    }
  },

  onLoadSample(valid = true) {
    const payload = valid ? validLessonResultSample : invalidLessonResultSample;
    const textArea = document.querySelector("#result-input");
    if (textArea) {
      textArea.value = JSON.stringify(payload, null, 2);
    }
  },

  async onCopyRepairPrompt() {
    return copyText(getState().repairPrompt);
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

        updateState({
          progress: normalizedPayload,
          lessonLoop: emptyLessonLoop(),
          importStatus: null,
          repairPrompt: "",
        });
        coreLoopFeedback = null;
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
    coreLoopFeedback = null;
  },

  onToggleLessonDone() {
    const loopState = getState().lessonLoop || emptyLessonLoop();
    if (!loopState.promptReady) {
      setCoreLoopFeedback("Complete step 1 first: generate the prompt.", false);
      renderApp();
      return;
    }
    if (isLessonLoopComplete(loopState)) {
      return;
    }

    const nextDone = !Boolean(loopState.lessonDone);
    const nextLessonLoop = {
      ...loopState,
      lessonDone: nextDone,
    };

    if (!nextDone) {
      nextLessonLoop.resultImported = false;
      nextLessonLoop.lastCompletedAt = null;
    } else if (isLessonLoopComplete(nextLessonLoop)) {
      nextLessonLoop.lastCompletedAt = new Date().toISOString();
    }

    setCoreLoopFeedback(nextDone ? "Lesson step marked done." : "Lesson step reset to not done.", true);
    updateState({
      lessonLoop: nextLessonLoop,
    });
  },

  onStartNextLoop() {
    coreLoopFeedback = null;
    updateState({
      lessonLoop: emptyLessonLoop(),
      promptText: "",
    });
    if (window.location.hash !== "#/prompt") {
      window.location.hash = "#/prompt";
    } else {
      renderApp();
    }
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
  root.innerHTML = renderShell(route, page.html, {
    isDarkMode: getCurrentTheme() === "dark",
    lessonLoop: state.lessonLoop,
    nextLesson: state.progress?.nextLesson || null,
    coreLoopCollapsed: isCoreLoopCollapsed,
    coreLoopFeedback,
  });
  if (page.bind) {
    page.bind(root);
  }
  bindShellEvents();

  try {
    if (window.HSStaticMethods?.autoInit) {
      window.HSStaticMethods.autoInit();
    }
  } catch (_) {
    // Non-blocking initialization. Custom UI remains usable without JS widgets.
  }
}

function bindShellEvents() {
  document.body.classList.remove("overflow-hidden");

  const themeButton = root.querySelector("#theme-toggle");
  themeButton?.addEventListener("click", () => {
    const theme = toggleTheme();
    themeButton.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    themeButton.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  });

  const mobileMenuButton = root.querySelector("#mobile-menu-toggle");
  const sidebar = root.querySelector("#app-sidebar");
  const backdrop = root.querySelector("#mobile-nav-backdrop");

  function closeMobileMenu() {
    if (!sidebar || !backdrop) {
      return;
    }
    sidebar.classList.add("-translate-x-full");
    sidebar.classList.remove("translate-x-0");
    sidebar.setAttribute("aria-hidden", "true");
    backdrop.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  function openMobileMenu() {
    if (!sidebar || !backdrop) {
      return;
    }
    sidebar.classList.remove("-translate-x-full");
    sidebar.classList.add("translate-x-0");
    sidebar.setAttribute("aria-hidden", "false");
    backdrop.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  mobileMenuButton?.addEventListener("click", () => {
    if (!sidebar) {
      return;
    }

    if (sidebar.classList.contains("-translate-x-full")) {
      openMobileMenu();
      return;
    }

    closeMobileMenu();
  });

  backdrop?.addEventListener("click", closeMobileMenu);
  root.querySelectorAll("#app-sidebar a[href^='#/']").forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  root.querySelector("#core-loop-toggle")?.addEventListener("click", () => {
    isCoreLoopCollapsed = !isCoreLoopCollapsed;
    renderApp();
  });

  root.querySelectorAll("[data-mark-lesson-done]").forEach((button) => {
    button.addEventListener("click", () => {
      actions.onToggleLessonDone();
    });
  });

  root.querySelectorAll("[data-start-next-loop]").forEach((button) => {
    button.addEventListener("click", () => {
      actions.onStartNextLoop();
    });
  });
}

window.addEventListener("hashchange", renderApp);
initTheme();
subscribe(renderApp);
renderApp();
