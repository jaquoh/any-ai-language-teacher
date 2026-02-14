import { sectionCard } from "../components/layout.js";
import { normalizeWeights } from "../../core/scoringEngine.js";

function asPercent(value) {
  return `${Math.round(value * 100)}%`;
}

export function renderSettings(state) {
  const weights = normalizeWeights(state.progress.scoreConfig.weights);

  const sliderBlock = ["grammar", "verbs", "vocabulary", "fluency"]
    .map(
      (key) => `
      <label class="form-control mb-4">
        <div class="label">
          <span class="label-text capitalize">${key}</span>
          <span class="label-text-alt" id="weight-value-${key}">${asPercent(weights[key])}</span>
        </div>
        <input type="range" min="0" max="100" value="${Math.round(weights[key] * 100)}" data-weight-key="${key}" class="range range-primary" />
      </label>
    `,
    )
    .join("");

  const contributionHtml = Object.entries(weights)
    .map(([key, value]) => `<li class="capitalize">${key}: ${asPercent(value)}</li>`)
    .join("");

  return `
    <div class="grid gap-4 lg:grid-cols-2">
      ${sectionCard(
        "Scoring Focus",
        `<p class="mb-2 text-sm opacity-80">Adjust weighting by factor. All historical scores are recomputed immediately.</p>
         ${sliderBlock}
         <button id="reset-weights" class="btn btn-sm btn-outline">Reset to defaults</button>`,
      )}

      ${sectionCard(
        "Formula",
        `<p class="text-sm">Composite = grammar*w1 + verbs*w2 + vocabulary*w3 + fluency*w4</p>
         <ul class="mt-3 space-y-1 text-sm">${contributionHtml}</ul>`,
      )}

      ${sectionCard(
        "Project Data",
        `<p class="text-sm opacity-80 mb-3">Primary persistence is JSON import/export per language project.</p>
         <div class="flex flex-wrap gap-2">
           <button id="export-progress" class="btn btn-sm btn-primary">Export ProgressData</button>
           <button id="import-progress-trigger" class="btn btn-sm btn-outline">Import ProgressData</button>
           <button id="reset-project" class="btn btn-sm btn-outline">Reset to Sample</button>
         </div>
         <input id="import-progress-input" type="file" accept="application/json" class="hidden" />`,
      )}

      ${sectionCard(
        "Customization",
        `<p class="text-sm opacity-80">Use this page for less frequent configuration changes. Keep Dashboard focused on motivation and learning momentum.</p>`,
      )}
    </div>
  `;
}

export function bindSettingsEvents(root, state, actions) {
  const sliders = root.querySelectorAll("input[data-weight-key]");
  sliders.forEach((slider) => {
    slider.addEventListener("input", () => {
      const next = { ...state.progress.scoreConfig.weights };

      sliders.forEach((currentSlider) => {
        const key = currentSlider.getAttribute("data-weight-key");
        next[key] = Number(currentSlider.value) / 100;
      });

      actions.onScoreWeightsChange(next);
    });
  });

  root.querySelector("#reset-weights")?.addEventListener("click", () => actions.onScoreWeightsReset());
  root.querySelector("#export-progress")?.addEventListener("click", () => actions.onExportProgress());

  const importInput = root.querySelector("#import-progress-input");
  root.querySelector("#import-progress-trigger")?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", (event) => actions.onImportProgressFile(event));

  root.querySelector("#reset-project")?.addEventListener("click", () => actions.onResetProject());
}
