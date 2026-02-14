import { sectionCard } from "../components/layout.js";

export function renderPromptBuilder(state) {
  const body = `
    <p class="text-sm opacity-80 mb-3">Generate a self-contained packet to paste into a fresh AI chat for the next lesson.</p>
    <div class="flex gap-2 mb-4">
      <button id="generate-prompt" class="btn btn-primary">Generate Prompt</button>
      <button id="copy-prompt" class="btn btn-outline">Copy to Clipboard</button>
    </div>
    <textarea id="prompt-output" class="textarea textarea-bordered w-full min-h-96 font-mono text-xs" placeholder="Prompt packet appears here">${state.promptText || ""}</textarea>
  `;

  return sectionCard("Next Lesson Prompt Packet", body);
}

export function bindPromptBuilderEvents(root, actions) {
  const generateButton = root.querySelector("#generate-prompt");
  const copyButton = root.querySelector("#copy-prompt");

  generateButton?.addEventListener("click", () => actions.onGeneratePrompt());
  copyButton?.addEventListener("click", () => actions.onCopyPrompt());
}
