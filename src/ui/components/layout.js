import { routeLabel } from "../router.js";

const LINKS = [
  { href: "#/", id: "dashboard", label: "Dashboard" },
  { href: "#/prompt", id: "promptBuilder", label: "Prompt" },
  { href: "#/import", id: "importResult", label: "Import" },
  { href: "#/lessons", id: "lessons", label: "Lessons" },
  { href: "#/knowledge", id: "knowledge", label: "Knowledge" },
  { href: "#/plan", id: "plan", label: "Plan" },
  { href: "#/settings", id: "settings", label: "Settings" },
  { href: "#/about", id: "about", label: "About" },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderSideNav(activeRoute) {
  const links = LINKS.map((link) => {
    const active = activeRoute === link.id;
    const base =
      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";
    const activeClasses = "bg-brand-600 text-white shadow-sm shadow-brand-900/20";
    const idleClasses =
      "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80";

    return `<a class="${base} ${active ? activeClasses : idleClasses}" href="${link.href}">
      <span>${link.label}</span>
      <span class="text-[10px] opacity-70">${active ? "Here" : ""}</span>
    </a>`;
  }).join("");

  return `
    <aside id="app-sidebar" class="fixed top-0 start-0 z-[70] h-full w-72 -translate-x-full bg-transparent transition-transform duration-300 lg:translate-x-0" tabindex="-1" aria-hidden="true">
      <div class="flex h-full flex-col border-e border-slate-200 bg-base-100/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
        <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h1 class="text-lg font-semibold tracking-tight">Any AI Teacher</h1>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Portable language learning cockpit</p>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          ${links}
        </nav>

        <div class="border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Flow: Prompt -> Lesson -> Import
        </div>
      </div>
    </aside>
  `;
}

function renderBreadcrumbs(activeRoute) {
  const currentLabel = routeLabel(activeRoute);
  if (activeRoute === "dashboard") {
    return `
      <nav aria-label="Breadcrumb">
        <ol class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <li><span class="font-medium text-slate-700 dark:text-slate-200">Dashboard</span></li>
        </ol>
      </nav>
    `;
  }

  return `
    <nav aria-label="Breadcrumb">
      <ol class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <li><a class="hover:text-brand-600 dark:hover:text-brand-300" href="#/">Dashboard</a></li>
        <li aria-hidden="true">/</li>
        <li><span class="font-medium text-slate-700 dark:text-slate-200">${currentLabel}</span></li>
      </ol>
    </nav>
  `;
}

function stepIcon(done, number) {
  if (!done) {
    return `<span class="inline-flex size-7 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">${number}</span>`;
  }
  return `<span class="inline-flex size-7 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white shadow-sm shadow-emerald-800/20">&#10003;</span>`;
}

function renderCompactStep(label, state, stepNumber, href = null, isAction = false, isDisabled = false) {
  const stateClasses =
    state === "done"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950 dark:text-emerald-300"
      : state === "current"
        ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-600/70 dark:bg-slate-800 dark:text-brand-200"
        : "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  const hoverClasses =
    state === "done"
      ? "hover:border-emerald-300 hover:bg-emerald-100 dark:hover:border-emerald-700/70 dark:hover:bg-emerald-900/45"
      : state === "current"
        ? "hover:border-brand-300 hover:bg-brand-100 dark:hover:border-brand-600/70 dark:hover:bg-brand-900/50"
        : "hover:border-slate-300 hover:bg-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800/80";

  const icon =
    state === "done"
      ? `<span class="inline-flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-white">&#10003;</span>`
      : `<span class="inline-flex size-5 items-center justify-center rounded-full border border-current text-[10px] font-semibold">${stepNumber}</span>`;

  const content = `${icon}<span class="text-xs font-medium">${label}</span>`;
  const interactionClasses = isDisabled
    ? "transition duration-150"
    : `transition duration-150 hover:-translate-y-px hover:shadow-sm ${hoverClasses}`;

  if (href) {
    return `<a class="inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 ${interactionClasses} ${stateClasses}" href="${href}">${content}</a>`;
  }

  if (isAction) {
    return `<button type="button" data-mark-lesson-done class="inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-left ${isDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"} ${interactionClasses} ${stateClasses}" ${isDisabled ? "disabled" : ""}>${content}</button>`;
  }

  return `<span class="inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 ${stateClasses}">${content}</span>`;
}

function renderLoopStepper(loopState, nextLesson = null, isCollapsed = false, feedback = null) {
  const step1 = Boolean(loopState?.promptReady);
  const step2 = Boolean(loopState?.lessonDone);
  const step3 = Boolean(loopState?.resultImported);
  const completed = step1 && step2 && step3;
  const step2Locked = !step1 || completed;
  const currentStep = !step1 ? 1 : !step2 ? 2 : !step3 ? 3 : 0;
  const statusLabel = completed ? "Completed" : "In progress";
  const statusClass = completed
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  const lessonLabel = nextLesson
    ? `${escapeHtml(nextLesson.topic || "next topic")} ${escapeHtml(nextLesson.moduleId || "")}`.trim()
    : "next lesson";
  const stepOneDescription = `Generate and copy your next lesson packet for: ${lessonLabel}.`;
  const completionMessage = "Great loop completion. Start the next lesson by generating a fresh prompt.";

  const stepClass = (done, active) =>
    `group flex min-w-0 flex-1 flex-col items-start gap-2 rounded-2xl border p-3 transition duration-150 hover:-translate-y-px hover:shadow-sm ${
      done
        ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800/50 dark:bg-emerald-950 dark:hover:bg-emerald-900/50"
        : active
          ? "border-brand-200 bg-brand-50 hover:border-brand-300 hover:bg-brand-100 dark:border-brand-600/70 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-brand-500/80 dark:hover:bg-slate-700"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
    }`;

  if (isCollapsed) {
    const s1 = step1 ? "done" : currentStep === 1 ? "current" : "pending";
    const s2 = step2 ? "done" : currentStep === 2 ? "current" : "pending";
    const s3 = step3 ? "done" : currentStep === 3 ? "current" : "pending";

    return `
      <section class="card border-slate-200 bg-base-100/95 dark:border-slate-800">
        <div class="card-body p-3">
          <div class="flex items-center justify-between gap-3">
            <div class="inline-flex items-center gap-2">
              <h2 class="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">Core Lesson Loop</h2>
              <span class="rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass}">${statusLabel}</span>
            </div>
            <div class="inline-flex items-center gap-2">
              ${completed ? '<button data-start-next-loop type="button" class="inline-flex items-center rounded-lg border border-emerald-300 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/50">Start Next Loop</button>' : ""}
              <button id="core-loop-toggle" type="button" class="inline-flex items-center rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Expand</button>
            </div>
          </div>
          <div class="flex items-center gap-2 overflow-x-auto pt-1">
            ${renderCompactStep("Prompt", s1, 1, "#/prompt")}
            ${renderCompactStep("Lesson", s2, 2, null, true, step2Locked)}
            ${renderCompactStep("Import", s3, 3, "#/import")}
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="card border-slate-200 bg-base-100/95 dark:border-slate-800">
      <div class="card-body p-3">
        <div class="flex items-center justify-between gap-3">
          <div class="inline-flex items-center gap-2">
            <h2 class="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">Core Lesson Loop</h2>
            <span class="rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass}">${statusLabel}</span>
          </div>
          <div class="inline-flex items-center gap-2">
            ${completed ? '<button data-start-next-loop type="button" class="inline-flex items-center rounded-lg border border-emerald-300 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/50">Start Next Loop</button>' : ""}
            <button id="core-loop-toggle" type="button" class="inline-flex items-center rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Collapse</button>
          </div>
        </div>

        <div class="mt-2 grid gap-3 sm:grid-cols-3">
          <a class="${stepClass(step1, !step1)}" href="#/prompt">
            ${stepIcon(step1, 1)}
            <p class="text-sm font-medium">Create Prompt</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">${stepOneDescription}</p>
          </a>

          <button data-mark-lesson-done type="button" class="${stepClass(step2, step1 && !step2)} ${step2Locked ? "cursor-not-allowed opacity-70" : "cursor-pointer"} text-left" ${step2Locked ? "disabled" : ""}>
            ${stepIcon(step2, 2)}
            <p class="text-sm font-medium">Do Lesson</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Run the interactive lesson in your AI chat, then mark done here.</p>
          </button>

          <a class="${stepClass(step3, step2 && !step3)}" href="#/import">
            ${stepIcon(step3, 3)}
            <p class="text-sm font-medium">Import Result</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Paste final JSON and import for scoring + history.</p>
          </a>
        </div>

        ${
          feedback || completed
            ? `<p class="mt-2 rounded-xl border px-3 py-2 text-xs font-medium ${(feedback?.ok ?? completed) ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950 dark:text-emerald-300" : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950 dark:text-amber-300"}">${escapeHtml(feedback?.message || completionMessage)}</p>`
            : ""
        }
      </div>
    </section>
  `;
}

export function renderShell(activeRoute, contentHtml, options = {}) {
  const isDarkMode = Boolean(options.isDarkMode);
  const lessonLoop = options.lessonLoop || {};
  const nextLesson = options.nextLesson || null;
  const coreLoopCollapsed = Boolean(options.coreLoopCollapsed);
  const coreLoopFeedback = options.coreLoopFeedback || null;
  const showAuth = Boolean(options.showAuth);
  const userName = options.userName ? escapeHtml(options.userName) : "";
  const themeLabel = isDarkMode ? "Light mode" : "Dark mode";

  return `
    <div class="app-shell min-h-screen bg-gradient-to-br from-brand-50/80 via-base-100 to-sky-50/70 text-neutral dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      ${renderSideNav(activeRoute)}
      <div id="mobile-nav-backdrop" class="fixed inset-0 z-[60] hidden bg-slate-950/45 lg:hidden"></div>

      <header class="sticky top-0 z-40 border-b border-slate-200 bg-base-100/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85 lg:ps-72">
        <div class="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div class="flex items-center gap-2">
            <button id="mobile-menu-toggle" type="button" class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden" aria-label="Open navigation">
              &#9776;
              <span>Menu</span>
            </button>
            <div>
              <p class="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Portable AI Language Teacher</p>
              <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">${routeLabel(activeRoute)}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            ${
              showAuth
                ? `<div class="hidden rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300 sm:block">Signed in: <span class="font-semibold">${userName}</span></div>
                   <button id="logout-button" type="button" class="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Log out</button>`
                : ""
            }
            <button id="theme-toggle" type="button" aria-pressed="${isDarkMode ? "true" : "false"}" class="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">${themeLabel}</button>
          </div>
        </div>
      </header>

      <main class="lg:ps-72">
        <div class="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
          ${renderBreadcrumbs(activeRoute)}
          ${renderLoopStepper(lessonLoop, nextLesson, coreLoopCollapsed, coreLoopFeedback)}
          ${contentHtml}
        </div>
      </main>
    </div>
  `;
}

export function statCard(label, value, helper = "") {
  return `
    <section class="card border-slate-200 bg-base-100/95 dark:border-slate-800">
      <div class="card-body p-5">
        <h2 class="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">${label}</h2>
        <p class="text-3xl font-semibold">${value}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">${helper}</p>
      </div>
    </section>
  `;
}

export function sectionCard(title, bodyHtml) {
  return `
    <section class="card border-slate-200 bg-base-100/95 dark:border-slate-800">
      <div class="card-body p-5">
        <h2 class="card-title text-lg">${title}</h2>
        ${bodyHtml}
      </div>
    </section>
  `;
}
