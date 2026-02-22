import "./styles.css";
import "preline";
import validLessonResultSample from "../examples/lesson-result.valid.sample.json";
import invalidLessonResultSample from "../examples/lesson-result.invalid.sample.json";
import confetti from "canvas-confetti";

import { getCurrentRoute } from "./ui/router.js";
import { renderShell } from "./ui/components/layout.js";
import { renderDashboard, bindDashboardEvents } from "./ui/pages/dashboard.js";
import { renderPromptBuilder, bindPromptBuilderEvents } from "./ui/pages/prompt-builder.js";
import { renderAiLesson, bindAiLessonEvents } from "./ui/pages/ai-lesson.js";
import { renderImportResult, bindImportResultEvents } from "./ui/pages/import-result.js";
import { renderLessons } from "./ui/pages/lessons.js";
import { renderKnowledge, bindKnowledgeEvents } from "./ui/pages/knowledge.js";
import { renderPlan } from "./ui/pages/plan.js";
import { renderSettings, bindSettingsEvents } from "./ui/pages/settings.js";
import { renderFaq } from "./ui/pages/faq.js";
import { renderAbout } from "./ui/pages/about.js";
import { renderAuthPage, bindAuthEvents } from "./ui/pages/auth.js";

import { getState, subscribe, updateState, resetToSample } from "./state/store.js";
import { DEFAULT_WEIGHTS, normalizeWeights } from "./core/scoringEngine.js";
import { applyScoreWeights, hydrateLessonHistoryAiSource } from "./core/progressUpdater.js";
import { buildNextLessonPacket, renderNextLessonPrompt } from "./core/promptGenerator.js";
import { importLessonResult } from "./core/importEngine.js";
import { speakText } from "./core/speech.js";
import { getCurrentTheme, initTheme, toggleTheme } from "./core/theme.js";
import { validateBySchema } from "./core/validator.js";
import {
  probeBackend,
  readSession,
  writeSession,
  clearSession,
  registerUser,
  loginUser,
  fetchProfile,
  saveProfile,
  updateAccountProfile,
  changeAccountPassword,
  logoutUser,
  isAuthFailure,
} from "./core/remoteProfileApi.js";

const root = document.querySelector("#app");
let isCoreLoopCollapsed = false;
let coreLoopFeedback = null;
let applyRemoteStateLock = false;
let lastSyncedSignature = null;
let syncTimer = null;
let syncInFlight = false;
let pendingSync = false;

const authState = {
  initialized: false,
  backendEnabled: false,
  isAuthenticated: false,
  token: "",
  userName: "",
  avatarUrl: "",
  mode: "login",
  isBusy: false,
  error: "",
  accountProfileBusy: false,
  accountPasswordBusy: false,
  accountProfileMessage: null,
  accountPasswordMessage: null,
};

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

function clearAccountMessages() {
  authState.accountProfileMessage = null;
  authState.accountPasswordMessage = null;
}

function stateSyncSignature(state) {
  return JSON.stringify({
    progress: state.progress,
    lessonLoop: state.lessonLoop,
  });
}

function setSession(token, userName) {
  authState.token = token;
  authState.userName = userName;
  authState.isAuthenticated = Boolean(token);

  if (authState.isAuthenticated) {
    writeSession({
      token,
      userName,
    });
    return;
  }

  authState.avatarUrl = "";
  clearSession();
}

async function applyRemoteProfile(profile) {
  const state = getState();

  const remoteProgress =
    profile.progressData && typeof profile.progressData === "object" ? profile.progressData : state.progress;
  const progressValidation = validateBySchema("progressData", remoteProgress);
  const nextProgress = progressValidation.valid ? remoteProgress : state.progress;
  const nextLessonLoop =
    profile.lessonLoop && typeof profile.lessonLoop === "object" ? profile.lessonLoop : emptyLessonLoop();
  const nextSignature = JSON.stringify({
    progress: nextProgress,
    lessonLoop: nextLessonLoop,
  });

  lastSyncedSignature = nextSignature;
  applyRemoteStateLock = true;
  updateState({
    progress: nextProgress,
    lessonLoop: nextLessonLoop,
    importStatus: null,
    repairPrompt: "",
    promptText: "",
  });
  applyRemoteStateLock = false;
}

async function refreshProfileFromServer() {
  const profile = await fetchProfile(authState.token);
  authState.userName = profile.userName || authState.userName;
  authState.avatarUrl = profile.avatarUrl || "";
  setSession(authState.token, authState.userName);
  await applyRemoteProfile(profile);
}

function clearSyncTimer() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}

async function executeSync() {
  if (
    !authState.backendEnabled ||
    !authState.isAuthenticated ||
    !authState.token ||
    applyRemoteStateLock ||
    syncInFlight
  ) {
    return;
  }

  const state = getState();
  const signature = stateSyncSignature(state);
  if (signature === lastSyncedSignature) {
    return;
  }

  syncInFlight = true;
  try {
    await saveProfile(authState.token, state.progress, state.lessonLoop);
    lastSyncedSignature = signature;
  } catch (error) {
    if (isAuthFailure(error)) {
      await actions.onLogout({
        preserveError: "Your session expired. Please log in again.",
      });
      return;
    }
  } finally {
    syncInFlight = false;
    if (pendingSync) {
      pendingSync = false;
      scheduleProfileSync();
    }
  }
}

function scheduleProfileSync() {
  if (!authState.backendEnabled || !authState.isAuthenticated || applyRemoteStateLock) {
    return;
  }

  if (syncInFlight) {
    pendingSync = true;
    return;
  }

  clearSyncTimer();
  syncTimer = setTimeout(() => {
    syncTimer = null;
    executeSync();
  }, 450);
}

async function initializeAuth() {
  const previousSession = readSession();
  if (previousSession?.token) {
    authState.token = previousSession.token;
    authState.userName = previousSession.userName || "";
  }

  authState.backendEnabled = await probeBackend();
  authState.initialized = true;

  if (!authState.backendEnabled) {
    setSession("", "");
    renderApp();
    return;
  }

  if (!authState.token) {
    authState.isAuthenticated = false;
    renderApp();
    return;
  }

  authState.isBusy = true;
  try {
    await refreshProfileFromServer();
    authState.isAuthenticated = true;
    authState.error = "";
  } catch (_) {
    setSession("", "");
    authState.error = "Saved session is invalid. Please log in again.";
  } finally {
    authState.isBusy = false;
    renderApp();
  }
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

  onCompleteLessonAndGoImport() {
    const loopState = getState().lessonLoop || emptyLessonLoop();

    if (!loopState.promptReady) {
      setCoreLoopFeedback("Complete step 1 first: generate the prompt.", false);
      if (window.location.hash !== "#/prompt") {
        window.location.hash = "#/prompt";
      } else {
        renderApp();
      }
      return;
    }

    const nextLessonLoop = {
      ...loopState,
      promptReady: true,
      lessonDone: true,
    };

    if (isLessonLoopComplete(nextLessonLoop) && !nextLessonLoop.lastCompletedAt) {
      nextLessonLoop.lastCompletedAt = new Date().toISOString();
    }

    setCoreLoopFeedback("Lesson step marked done. Continue with Import Result.", true);
    updateState({
      lessonLoop: nextLessonLoop,
    });

    if (window.location.hash !== "#/import") {
      window.location.hash = "#/import";
    } else {
      renderApp();
    }
  },

  onSetAuthMode(nextMode) {
    if (nextMode !== "login" && nextMode !== "register") {
      return;
    }
    authState.mode = nextMode;
    authState.error = "";
    clearAccountMessages();
    renderApp();
  },

  async onSubmitAuth(credentials) {
    if (!authState.backendEnabled || authState.isBusy) {
      return;
    }

    const name = String(credentials?.name || "").trim();
    const password = String(credentials?.password || "");

    if (!name || !password) {
      authState.error = "Name and password are required.";
      renderApp();
      return;
    }

    authState.isBusy = true;
    authState.error = "";
    renderApp();

    try {
      const authPayload =
        authState.mode === "register"
          ? await registerUser({ name, password })
          : await loginUser({ name, password });
      setSession(authPayload.token, authPayload.userName);
      authState.isAuthenticated = true;
      await refreshProfileFromServer();
      authState.error = "";
      clearAccountMessages();
    } catch (error) {
      authState.error = error?.message || "Could not complete authentication.";
      authState.isAuthenticated = false;
    } finally {
      authState.isBusy = false;
      renderApp();
    }
  },

  async onLogout(options = {}) {
    const preserveError = options?.preserveError || "";
    const token = authState.token;

    clearSyncTimer();
    syncInFlight = false;
    pendingSync = false;
    lastSyncedSignature = null;

    setSession("", "");
    authState.isAuthenticated = false;
    authState.isBusy = false;
    authState.mode = "login";
    authState.error = preserveError;
    authState.accountProfileBusy = false;
    authState.accountPasswordBusy = false;
    clearAccountMessages();

    resetToSample();
    coreLoopFeedback = null;

    await logoutUser(token);
    renderApp();
  },

  async onSaveAccountProfile(payload) {
    if (!authState.backendEnabled || !authState.isAuthenticated || authState.accountProfileBusy) {
      return;
    }

    const nextName = String(payload?.name || "").trim();
    if (!nextName) {
      authState.accountProfileMessage = {
        ok: false,
        text: "User name is required.",
      };
      renderApp();
      return;
    }

    authState.accountProfileBusy = true;
    authState.accountProfileMessage = null;
    renderApp();

    try {
      const updated = await updateAccountProfile(authState.token, {
        name: nextName,
        avatarUrl: payload?.avatarUrl || "",
      });
      if (updated.userName) {
        authState.userName = updated.userName;
      }
      authState.avatarUrl = updated.avatarUrl || "";
      setSession(authState.token, authState.userName);
      authState.accountProfileMessage = {
        ok: true,
        text: "Profile updated.",
      };
    } catch (error) {
      if (isAuthFailure(error)) {
        await actions.onLogout({
          preserveError: "Your session expired. Please log in again.",
        });
        return;
      }
      authState.accountProfileMessage = {
        ok: false,
        text: error?.message || "Could not save profile.",
      };
    } finally {
      authState.accountProfileBusy = false;
      renderApp();
    }
  },

  async onChangeAccountPassword(payload) {
    if (!authState.backendEnabled || !authState.isAuthenticated || authState.accountPasswordBusy) {
      return;
    }

    const currentPassword = String(payload?.currentPassword || "");
    const newPassword = String(payload?.newPassword || "");
    const confirmPassword = String(payload?.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      authState.accountPasswordMessage = {
        ok: false,
        text: "Fill in all password fields.",
      };
      renderApp();
      return;
    }

    if (newPassword !== confirmPassword) {
      authState.accountPasswordMessage = {
        ok: false,
        text: "New password and confirmation do not match.",
      };
      renderApp();
      return;
    }

    authState.accountPasswordBusy = true;
    authState.accountPasswordMessage = null;
    renderApp();

    try {
      await changeAccountPassword(authState.token, currentPassword, newPassword);
      authState.accountPasswordMessage = {
        ok: true,
        text: "Password updated successfully.",
      };
    } catch (error) {
      if (isAuthFailure(error)) {
        await actions.onLogout({
          preserveError: "Your session expired. Please log in again.",
        });
        return;
      }
      authState.accountPasswordMessage = {
        ok: false,
        text: error?.message || "Could not update password.",
      };
    } finally {
      authState.accountPasswordBusy = false;
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
    case "aiLesson":
      return {
        html: renderAiLesson(state),
        bind: (container) => bindAiLessonEvents(container, actions),
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
        html: renderSettings(state, {
          serverSyncEnabled: authState.backendEnabled,
          account:
            authState.backendEnabled && authState.isAuthenticated
              ? {
                  userName: authState.userName,
                  avatarUrl: authState.avatarUrl,
                  profileBusy: authState.accountProfileBusy,
                  passwordBusy: authState.accountPasswordBusy,
                  profileMessage: authState.accountProfileMessage,
                  passwordMessage: authState.accountPasswordMessage,
                }
              : null,
        }),
        bind: (container) => bindSettingsEvents(container, state, actions),
      };
    case "faq":
      return { html: renderFaq(state), bind: null };
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
  if (!authState.initialized) {
    root.innerHTML = `
      <main class="min-h-screen bg-gradient-to-br from-brand-50 via-base-100 to-sky-50 px-4 py-10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div class="mx-auto max-w-md rounded-2xl border border-slate-200 bg-base-100/95 p-6 text-center dark:border-slate-800 dark:bg-slate-950/90">
          <h1 class="text-lg font-semibold">Starting app...</h1>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">Checking server capabilities.</p>
        </div>
      </main>
    `;
    return;
  }

  if (authState.backendEnabled && !authState.isAuthenticated) {
    root.innerHTML = renderAuthPage({
      mode: authState.mode,
      isBusy: authState.isBusy,
      error: authState.error,
    });
    bindAuthEvents(root, actions);
    return;
  }

  const state = getState();
  const route = getCurrentRoute();
  const page = renderRouteContent(route, state);
  root.innerHTML = renderShell(route, page.html, {
    isDarkMode: getCurrentTheme() === "dark",
    lessonLoop: state.lessonLoop,
    nextLesson: state.progress?.nextLesson || null,
    coreLoopCollapsed: isCoreLoopCollapsed,
    coreLoopFeedback,
    showAuth: authState.backendEnabled && authState.isAuthenticated,
    userName: authState.userName,
    userAvatarUrl: authState.avatarUrl,
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
  root.querySelectorAll("[data-account-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      actions.onLogout();
    });
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
subscribe(() => {
  renderApp();
  scheduleProfileSync();
});
renderApp();
initializeAuth();
