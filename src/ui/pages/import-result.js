import { sectionCard } from "../components/layout.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderErrors(errors = []) {
  if (!errors.length) {
    return "";
  }

  const rows = errors
    .map(
      (error) =>
        `<tr><td class="font-mono text-xs">${error.path}</td><td>${error.keyword}</td><td>${error.message}</td></tr>`,
    )
    .join("");

  return `
    <div class="mt-4 overflow-x-auto">
      <table class="table table-zebra table-xs">
        <thead><tr><th>Path</th><th>Rule</th><th>Message</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export function renderImportResult(state) {
  const next = state.progress?.nextLesson || {};
  const lessonLabel = `${next.topic || "next topic"} ${next.moduleId ? `(${next.moduleId})` : ""}`.trim();
  const status = state.importStatus;
  const statusHtml = status
    ? `<p class="mt-3 text-sm ${status.ok ? "text-success" : "text-error"}">${status.message}</p>`
    : "";

  const repairHtml = state.repairPrompt
    ? `<div class="mt-4">
         <label class="label"><span class="label-text">Repair Prompt</span></label>
         <textarea id="repair-prompt" class="textarea textarea-bordered w-full min-h-48 font-mono text-xs">${state.repairPrompt}</textarea>
         <button id="copy-repair-prompt" class="js-clipboard btn btn-sm btn-outline mt-2" type="button">
           <span class="js-clipboard-default inline-flex items-center gap-2">Copy Repair Prompt</span>
           <span class="js-clipboard-success hidden items-center gap-2">
             <span aria-hidden="true">&#10003;</span>
             <span class="js-clipboard-success-text">Copied!</span>
           </span>
         </button>
       </div>`
    : "";

  return sectionCard(
    `Import LessonResultData - ${escapeHtml(lessonLabel)}`,
    `
    <p class="text-sm opacity-80">Paste the lesson ending block (including optional recap text). The app extracts the final \`json\` fenced block and validates strictly.</p>
    <div class="mt-4 flex flex-wrap gap-2">
      <button id="import-result" class="btn btn-primary">Validate and Import</button>
      <button id="load-valid-sample" class="btn btn-outline btn-sm">Load Valid Sample</button>
      <button id="load-invalid-sample" class="btn btn-outline btn-sm">Load Invalid Sample</button>
    </div>
    <textarea id="result-input" class="textarea textarea-bordered w-full min-h-80 font-mono text-xs mt-4" placeholder="Paste lesson summary + final JSON block here"></textarea>
    ${statusHtml}
    ${status && !status.ok ? renderErrors(status.errors) : ""}
    ${repairHtml}
  `,
  );
}

export function bindImportResultEvents(root, actions) {
  function showCopyFeedback(button, ok, successText = "Copied!", errorText = "Copy failed") {
    if (!button) {
      return;
    }

    const defaultEl = button.querySelector(".js-clipboard-default");
    const successEl = button.querySelector(".js-clipboard-success");
    const textEl = button.querySelector(".js-clipboard-success-text");

    if (!defaultEl || !successEl || !textEl) {
      return;
    }

    const timerId = Number(button.dataset.copyFeedbackTimer || 0);
    if (timerId) {
      window.clearTimeout(timerId);
    }

    textEl.textContent = ok ? successText : errorText;
    defaultEl.classList.add("hidden");
    successEl.classList.remove("hidden");
    successEl.classList.add("inline-flex");

    const nextTimerId = window.setTimeout(() => {
      successEl.classList.remove("inline-flex");
      successEl.classList.add("hidden");
      defaultEl.classList.remove("hidden");
      delete button.dataset.copyFeedbackTimer;
    }, 900);
    button.dataset.copyFeedbackTimer = String(nextTimerId);
  }

  root.querySelector("#import-result")?.addEventListener("click", () => {
    const input = root.querySelector("#result-input")?.value || "";
    actions.onImportResult(input);
  });

  root.querySelector("#load-valid-sample")?.addEventListener("click", () => actions.onLoadSample(true));
  root.querySelector("#load-invalid-sample")?.addEventListener("click", () => actions.onLoadSample(false));
  root.querySelector("#copy-repair-prompt")?.addEventListener("click", async () => {
    const button = root.querySelector("#copy-repair-prompt");
    const ok = await actions.onCopyRepairPrompt();
    showCopyFeedback(button, ok);
  });
}
