const THEME_STORAGE_KEY = "any-ai-teacher.theme";

function getStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch (_) {
    return null;
  }
}

function getStoredTheme() {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch (_) {
    return null;
  }
}

function prefersDarkTheme() {
  try {
    return Boolean(globalThis?.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
  } catch (_) {
    return false;
  }
}

export function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.setAttribute("data-theme", nextTheme);
  }
  return nextTheme;
}

export function getCurrentTheme() {
  if (typeof document === "undefined") {
    return "light";
  }
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function initTheme() {
  const preferred = getStoredTheme() || (prefersDarkTheme() ? "dark" : "light");
  return applyTheme(preferred);
}

export function toggleTheme() {
  const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
  const applied = applyTheme(nextTheme);
  const storage = getStorage();

  if (storage) {
    try {
      storage.setItem(THEME_STORAGE_KEY, applied);
    } catch (_) {
      // Ignore storage failures.
    }
  }

  return applied;
}
