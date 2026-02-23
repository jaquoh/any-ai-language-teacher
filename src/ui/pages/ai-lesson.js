import { sectionCard } from "../components/layout.js";

const AI_CHAT_LINKS = [
  ["Z.AI Chat (recommended)", "https://chat.z.ai/"],
  ["ChatGPT", "https://chatgpt.com/"],
  ["NoteGPT AI Chat", "https://notegpt.io/ai-chat"],
  ["Easemate AI Chat", "https://www.easemate.ai/chatgpt-free"],
  ["chatgptfree.ai", "https://chatgptfree.ai/"],
  ["DeepAI Chat", "https://deepai.org/chat"],
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function linkCard(label, href) {
  return `
    <a href="${href}" target="_blank" rel="noopener noreferrer" class="group rounded-xl border border-slate-200 bg-base-100/90 p-3 transition hover:-translate-y-px hover:border-brand-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-brand-700">
      <p class="text-sm font-semibold text-slate-900 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300">${escapeHtml(label)}</p>
      <p class="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">${escapeHtml(href)}</p>
      <p class="mt-2 text-xs font-medium text-brand-700 dark:text-brand-300">Open in new tab</p>
    </a>
  `;
}

export function renderAiLesson(state) {
  const nextLesson = state?.progress?.nextLesson || null;
  const loopState = state?.lessonLoop || null;
  const promptReady = Boolean(loopState?.promptReady);
  const lessonDone = Boolean(loopState?.lessonDone);
  const topic = nextLesson?.topic || "your next topic";
  const moduleId = nextLesson?.moduleId || "current module";

  return `
    <div class="space-y-4">
      ${sectionCard(
        "AI Lesson: What To Do",
        `
          <div class="space-y-3 text-sm">
            <p>
              This is the <strong>Step 2</strong> part of the core loop. After generating the prompt, paste it into any AI chat and complete the lesson there.
            </p>
            <div class="rounded-xl border border-brand-200 bg-brand-50/70 p-3 dark:border-brand-800 dark:bg-brand-950/40">
              <p class="text-xs uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">Current focus</p>
              <p class="mt-1 font-medium">${escapeHtml(topic)}</p>
              <p class="text-xs opacity-80">Module: ${escapeHtml(moduleId)}</p>
            </div>
            <ol class="list-decimal space-y-1 pl-5">
              <li>Open the <a href="#/prompt" class="link link-primary">Prompt</a> page and generate/copy the lesson packet.</li>
              <li>Paste it into an AI chat website (examples below).</li>
              <li>Do the full lesson (speaking/typing as instructed by the AI).</li>
              <li>At the end, ensure the AI returns the final structured JSON result.</li>
              <li>Open <a href="#/import" class="link link-primary">Import</a> and paste the JSON to validate/import it.</li>
            </ol>
            <div class="mt-4 rounded-2xl border border-rose-300 bg-rose-50/80 p-3 dark:border-rose-800 dark:bg-rose-950/40">
              <p class="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-300">After you finish the lesson</p>
              <button type="button" data-complete-lesson-import class="btn btn-error w-full cursor-pointer border border-rose-700/60 sm:w-auto transition duration-150 hover:-translate-y-px hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none" ${promptReady ? "" : "disabled"}>
                ${lessonDone ? "Click here to confirm (Go To Import)" : "Click here to confirm"}
              </button>
              <p class="mt-2 text-xs text-rose-800/80 dark:text-rose-200/80">
                ${promptReady ? "This marks Step 2 (Do Lesson) and opens Step 3 (Import)." : "Generate the prompt first (Step 1) before completing the lesson step."}
              </p>
              <p class="mt-1 text-xs text-slate-600 dark:text-slate-300">
                If you skip this button and import a valid result directly, the app also auto-checks Step 2 during import.
              </p>
            </div>
          </div>
        `,
      )}

      ${sectionCard(
        "Free AI Chat Examples",
        `
          <p class="mb-3 text-sm opacity-80">These are example external websites you can use to run the lesson. They open in a new tab.</p>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            ${AI_CHAT_LINKS.map(([label, href]) => linkCard(label, href)).join("")}
          </div>
        `,
      )}

      ${sectionCard(
        "Important Notes & Disclaimer",
        `
          <div class="space-y-3 text-sm">
            <p class="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Lesson quality and results may vary drastically depending on the selected AI chat, model quality, rate limits, and site-specific restrictions.
            </p>
            <ul class="list-disc space-y-1 pl-5">
              <li>External websites may have different privacy policies, moderation rules, and retention behavior.</li>
              <li>Do not share sensitive personal information, financial data, or private documents in third-party chat sites.</li>
              <li>Some sites may be ad-supported, unreliable, or unavailable in some regions.</li>
              <li>Always review the final JSON result before importing it into the app.</li>
            </ul>
            <p class="text-xs text-slate-500 dark:text-slate-400">This app is not affiliated with the external sites listed above. They are provided as examples only.</p>
          </div>
        `,
      )}
    </div>
  `;
}

export function bindAiLessonEvents(root, actions) {
  root.querySelectorAll("[data-complete-lesson-import]").forEach((button) => {
    button.addEventListener("click", () => {
      actions.onCompleteLessonAndGoImport();
    });
  });
}
