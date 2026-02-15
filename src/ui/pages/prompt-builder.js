import { sectionCard } from "../components/layout.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderPromptBuilder(state) {
  const next = state.progress?.nextLesson || {};
  const lessonLabel = `${next.topic || "next topic"} ${next.moduleId ? `(${next.moduleId})` : ""}`.trim();
  const body = `
    <p class="text-sm opacity-80 mb-3">Generate a self-contained packet to paste into a fresh AI chat for the next lesson.</p>
    <div class="flex gap-2 mb-4">
      <button id="generate-prompt" class="btn btn-primary">Generate Prompt</button>
      <button id="copy-prompt" class="js-clipboard btn btn-outline" type="button">
        <span class="js-clipboard-default inline-flex items-center gap-2">
          Copy to Clipboard
        </span>
        <span class="js-clipboard-success hidden items-center gap-2">
          <span aria-hidden="true">&#10003;</span>
          <span class="js-clipboard-success-text">Copied!</span>
        </span>
      </button>
    </div>
    <textarea id="prompt-output" class="textarea textarea-bordered w-full min-h-96 font-mono text-xs" placeholder="Prompt packet appears here">${state.promptText || ""}</textarea>
  `;

  return sectionCard(`Next Lesson Prompt Packet - ${escapeHtml(lessonLabel)}`, body);
}

export function bindPromptBuilderEvents(root, actions) {
  const generateButton = root.querySelector("#generate-prompt");
  const copyButton = root.querySelector("#copy-prompt");

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

  generateButton?.addEventListener("click", () => actions.onGeneratePrompt());
  copyButton?.addEventListener("click", async () => {
    const ok = await actions.onCopyPrompt();
    showCopyFeedback(copyButton, ok);
  });
}
