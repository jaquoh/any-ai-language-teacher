import { sectionCard } from "../components/layout.js";

function stepCard(number, title, body, href = null) {
  const action = href
    ? `<a href="${href}" class="mt-3 inline-flex items-center rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-900/30">Open</a>`
    : "";

  return `
    <div class="rounded-2xl border border-slate-200 bg-base-100/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div class="mb-3 inline-flex size-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">${number}</div>
      <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">${title}</h3>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">${body}</p>
      ${action}
    </div>
  `;
}

export function renderFaq() {
  const appHowTo = sectionCard(
    "App: How It Works",
    `
      <div class="space-y-4 text-sm">
        <p>
          <strong>Idea:</strong> keep your language-learning progress outside any single AI chat. This app stores your structured progress, generates a lesson prompt packet, and imports the AI lesson result back into your progress.
        </p>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Dashboard</p>
            <p class="mt-1">See next lesson, score, and learning momentum.</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Prompt</p>
            <p class="mt-1">Generate the lesson packet to paste into your AI chat.</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Import</p>
            <p class="mt-1">Paste the final JSON lesson result and validate/import it.</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Knowledge + Lessons</p>
            <p class="mt-1">Review vocabulary, verbs, weak points, and lesson history.</p>
          </div>
        </div>
      </div>
    `,
  );

  const coreLoop = sectionCard(
    "Core Lesson Loop",
    `
      <div class="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
        ${stepCard("1", "Create Prompt", "Open Prompt Builder and click Generate Prompt. Copy it into your AI chat.", "#/prompt")}
        <div class="hidden lg:flex items-center justify-center text-slate-400">&#8594;</div>
        ${stepCard("2", "Do Lesson", "Complete the lesson in your AI chat. The teacher should return LessonResultData JSON at the end.")}
        <div class="hidden lg:flex items-center justify-center text-slate-400">&#8594;</div>
        ${stepCard("3", "Import Result", "Paste the JSON into Import Result and validate/import. Your progress updates and is saved.", "#/import")}
      </div>
      <p class="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        Tip: If import fails, use the repair prompt shown on the Import page to fix the JSON and try again.
      </p>
    `,
  );

  const accountPassword = sectionCard(
    "Account: Change Password",
    `
      <div class="space-y-3 text-sm">
        <p>Go to <a href="#/settings" class="link link-primary">Settings</a> and use the <strong>Change Password</strong> form.</p>
        <ol class="list-decimal pl-5 space-y-1">
          <li>Enter your current password.</li>
          <li>Enter a new password (8+ characters).</li>
          <li>Confirm the new password.</li>
          <li>Click <strong>Update Password</strong>.</li>
        </ol>
        <p class="text-xs text-slate-500 dark:text-slate-400">Your current login session remains active after the password change.</p>
      </div>
    `,
  );

  const migration = sectionCard(
    "Account: Migrate Progress To Another Account",
    `
      <div class="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
        Use this when you want to move your learning history from one account to another.
      </div>
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5 xl:items-stretch">
        ${stepCard("1", "Export Data", "In your current account, open Settings and click Export ProgressData.", "#/settings")}
        ${stepCard("2", "Log Out", "Use the top-right Log out button so you can switch accounts.")}
        ${stepCard("3", "Create / Log In", "Create the new account or log into the target account on the login screen.")}
        ${stepCard("4", "Import Data", "Open Settings and click Import ProgressData. Select the exported JSON file.", "#/settings")}
        ${stepCard("5", "Auto Save To New Account", "The imported progress loads into the app and is automatically saved to the currently logged-in account.")}
      </div>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
          <p class="font-medium">What moves?</p>
          <p class="mt-1 text-slate-600 dark:text-slate-300">Lesson history, scores, weak points, vocabulary, verbs, and next lesson state inside ProgressData.</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
          <p class="font-medium">What does not move automatically?</p>
          <p class="mt-1 text-slate-600 dark:text-slate-300">Account password and profile image URL are account-specific and must be set in the new account.</p>
        </div>
      </div>
    `,
  );

  return `
    <div class="space-y-4">
      ${appHowTo}
      ${coreLoop}
      ${accountPassword}
      ${migration}
    </div>
  `;
}
