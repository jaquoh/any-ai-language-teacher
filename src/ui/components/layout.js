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

function renderLoopStepper(loopState) {
  const step1 = Boolean(loopState?.promptReady);
  const step2 = Boolean(loopState?.lessonDone);
  const step3 = Boolean(loopState?.resultImported);
  const completed = step1 && step2 && step3;

  const stepClass = (done, active) =>
    `group flex min-w-0 flex-1 flex-col items-start gap-2 rounded-2xl border p-3 transition ${
      done
        ? "border-emerald-200 bg-emerald-50/90 dark:border-emerald-800/40 dark:bg-emerald-950/20"
        : active
          ? "border-brand-200 bg-brand-50/80 dark:border-brand-800/40 dark:bg-brand-950/20"
          : "border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60"
    }`;

  return `
    <section class="card border-slate-200 bg-base-100/95 dark:border-slate-800">
      <div class="card-body p-4">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">Core Lesson Loop</h2>
          <span class="rounded-full px-2.5 py-1 text-[11px] font-medium ${completed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}">
            ${completed ? "Completed" : "In progress"}
          </span>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <a class="${stepClass(step1, !step1)}" href="#/prompt">
            ${stepIcon(step1, 1)}
            <p class="text-sm font-medium">Create Prompt</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Generate and copy your next lesson packet.</p>
          </a>

          <button id="mark-lesson-done" type="button" class="${stepClass(step2, step1 && !step2)} text-left ${step2 ? "" : "hover:border-brand-300 hover:bg-brand-50 dark:hover:border-brand-700"}" ${step2 ? "disabled" : ""}>
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

        ${completed ? "<p class='text-xs font-medium text-emerald-700 dark:text-emerald-300'>Great loop completion. Start the next lesson by generating a fresh prompt.</p>" : ""}
      </div>
    </section>
  `;
}

export function renderShell(activeRoute, contentHtml, options = {}) {
  const isDarkMode = Boolean(options.isDarkMode);
  const lessonLoop = options.lessonLoop || {};
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

          <button id="theme-toggle" type="button" aria-pressed="${isDarkMode ? "true" : "false"}" class="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">${themeLabel}</button>
        </div>
      </header>

      <main class="lg:ps-72">
        <div class="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
          ${renderBreadcrumbs(activeRoute)}
          ${renderLoopStepper(lessonLoop)}
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
