function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderAuthPage(options = {}) {
  const mode = options.mode === "register" ? "register" : "login";
  const isBusy = Boolean(options.isBusy);
  const error = options.error ? String(options.error) : "";
  const title = mode === "register" ? "Create account" : "Log in";
  const submitLabel = isBusy ? "Please wait..." : mode === "register" ? "Create account" : "Log in";

  const loginTabClass =
    mode === "login"
      ? "border-brand-500 bg-brand-50 text-brand-700"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
  const registerTabClass =
    mode === "register"
      ? "border-brand-500 bg-brand-50 text-brand-700"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";

  return `
    <main class="min-h-screen bg-gradient-to-br from-brand-50 via-base-100 to-sky-50 px-4 py-8 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
      <div class="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-base-100/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
        <p class="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Any AI Teacher</p>
        <h1 class="mt-1 text-xl font-semibold">Server Sync Login</h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">Sign in to load and store your learning progress from the server.</p>

        <div class="mt-4 grid grid-cols-2 gap-2" role="tablist" aria-label="Auth mode">
          <button type="button" data-auth-mode="login" class="rounded-lg border px-3 py-2 text-sm font-medium transition ${loginTabClass}">Log in</button>
          <button type="button" data-auth-mode="register" class="rounded-lg border px-3 py-2 text-sm font-medium transition ${registerTabClass}">Create account</button>
        </div>

        <form id="auth-form" class="mt-4 space-y-3" novalidate>
          <div>
            <label for="auth-name" class="mb-1 block text-sm font-medium">Name</label>
            <input id="auth-name" name="name" type="text" autocomplete="username" minlength="3" maxlength="40" required class="input input-bordered w-full" placeholder="e.g. alex_teacher" />
          </div>

          <div>
            <label for="auth-password" class="mb-1 block text-sm font-medium">Password</label>
            <input id="auth-password" name="password" type="password" autocomplete="current-password" minlength="8" maxlength="120" required class="input input-bordered w-full" placeholder="At least 8 characters" />
          </div>

          ${
            error
              ? `<p class="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">${escapeHtml(error)}</p>`
              : ""
          }

          <button type="submit" class="btn btn-primary w-full" ${isBusy ? "disabled" : ""}>${submitLabel}</button>
        </form>

        <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Simple account: name + password. Passwords are stored hashed on the server.</p>
      </div>
    </main>
  `;
}

export function bindAuthEvents(root, actions) {
  root.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.getAttribute("data-auth-mode");
      if (nextMode === "login" || nextMode === "register") {
        actions.onSetAuthMode(nextMode);
      }
    });
  });

  root.querySelector("#auth-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    actions.onSubmitAuth({
      name: String(data.get("name") || "").trim(),
      password: String(data.get("password") || ""),
    });
  });
}
