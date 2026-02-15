import { sectionCard } from "../components/layout.js";
import { normalizeWeights } from "../../core/scoringEngine.js";

const WEIGHT_KEYS = ["grammar", "verbs", "vocabulary", "fluency"];

function clampPercent(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function toPercentWeights(weights) {
  const normalized = normalizeWeights(weights);
  const raw = WEIGHT_KEYS.map((key) => ({
    key,
    value: normalized[key] * 100,
  }));

  const next = {};
  let used = 0;

  for (const entry of raw) {
    const whole = Math.floor(entry.value);
    next[entry.key] = whole;
    used += whole;
  }

  let remaining = 100 - used;
  raw.sort((a, b) => {
    const aFrac = a.value - Math.floor(a.value);
    const bFrac = b.value - Math.floor(b.value);
    return bFrac - aFrac;
  });

  let cursor = 0;
  while (remaining > 0) {
    next[raw[cursor % raw.length].key] += 1;
    remaining -= 1;
    cursor += 1;
  }

  return next;
}

function distributeByShare(targetTotal, keys, getShare) {
  const raw = keys.map((key) => ({
    key,
    value: Math.max(0, getShare(key) * targetTotal),
  }));
  const next = {};
  let used = 0;

  for (const entry of raw) {
    const whole = Math.floor(entry.value);
    next[entry.key] = whole;
    used += whole;
  }

  let remaining = targetTotal - used;
  raw.sort((a, b) => {
    const aFrac = a.value - Math.floor(a.value);
    const bFrac = b.value - Math.floor(b.value);
    return bFrac - aFrac;
  });

  let cursor = 0;
  while (remaining > 0) {
    next[raw[cursor % raw.length].key] += 1;
    remaining -= 1;
    cursor += 1;
  }

  return next;
}

export function rebalancePercentWeights(currentPercentWeights, activeKey, requestedPercent) {
  const active = clampPercent(requestedPercent);
  const otherKeys = WEIGHT_KEYS.filter((key) => key !== activeKey);
  const remaining = 100 - active;

  if (!otherKeys.length) {
    return { [activeKey]: active };
  }

  const otherTotal = otherKeys.reduce(
    (sum, key) => sum + clampPercent(currentPercentWeights[key] ?? 0),
    0,
  );

  const rebalanced =
    otherTotal > 0
      ? distributeByShare(remaining, otherKeys, (key) => {
          const current = clampPercent(currentPercentWeights[key] ?? 0);
          return current / otherTotal;
        })
      : distributeByShare(remaining, otherKeys, () => 1 / otherKeys.length);

  return {
    ...rebalanced,
    [activeKey]: active,
  };
}

function toRatioWeights(percentWeights) {
  const next = {};
  for (const key of WEIGHT_KEYS) {
    next[key] = clampPercent(percentWeights[key] ?? 0) / 100;
  }
  return next;
}

export function renderSettings(state) {
  const weights = toPercentWeights(state.progress.scoreConfig.weights);

  const sliderBlock = WEIGHT_KEYS
    .map(
      (key) => `
      <label class="form-control mb-4">
        <div class="label">
          <span class="label-text capitalize">${key}</span>
          <span class="label-text-alt" id="weight-value-${key}">${weights[key]}%</span>
        </div>
        <input type="range" min="0" max="100" value="${weights[key]}" data-weight-key="${key}" class="range range-primary" />
      </label>
    `,
    )
    .join("");

  const contributionHtml = WEIGHT_KEYS.map(
    (key) => `<li class="capitalize" id="weight-contribution-${key}">${key}: ${weights[key]}%</li>`,
  )
    .join("");

  return `
    <div class="grid gap-4 lg:grid-cols-2">
      ${sectionCard(
        "Scoring Focus",
        `<p class="mb-2 text-sm opacity-80">Weights are linked. Drag one slider and the others rebalance live.</p>
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
        `<p class="text-sm opacity-80 mb-3">Progress auto-saves in this browser (localStorage). Import/export is still available for backup and moving to another device.</p>
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
  const sliderEntries = WEIGHT_KEYS.map((key) => ({
    key,
    slider: root.querySelector(`input[data-weight-key="${key}"]`),
    label: root.querySelector(`#weight-value-${key}`),
    contribution: root.querySelector(`#weight-contribution-${key}`),
  })).filter((entry) => entry.slider);

  let percentWeights = {};
  sliderEntries.forEach(({ key, slider }) => {
    percentWeights[key] = clampPercent(Number(slider.value));
  });

  root.querySelectorAll("a[href^='#/']").forEach((link) => {
    link.addEventListener("click", persistWeightsIfChanged);
  });
  let lastPersistedSignature = WEIGHT_KEYS.map((key) => percentWeights[key]).join("|");

  function syncUi(activeKey = null) {
    sliderEntries.forEach(({ key, slider, label, contribution }) => {
      const value = clampPercent(percentWeights[key] ?? 0);

      if (key !== activeKey || clampPercent(Number(slider.value)) !== value) {
        slider.value = String(value);
      }

      if (label) {
        label.textContent = `${value}%`;
      }

      if (contribution) {
        contribution.textContent = `${key}: ${value}%`;
      }
    });
  }

  function persistWeightsIfChanged() {
    const signature = WEIGHT_KEYS.map((key) => clampPercent(percentWeights[key] ?? 0)).join("|");
    if (signature === lastPersistedSignature) {
      return;
    }

    lastPersistedSignature = signature;
    actions.onScoreWeightsChange(toRatioWeights(percentWeights));
  }

  sliderEntries.forEach(({ key, slider }) => {
    slider.addEventListener("input", () => {
      percentWeights = rebalancePercentWeights(percentWeights, key, Number(slider.value));
      syncUi(key);
    });

    slider.addEventListener("change", persistWeightsIfChanged);
    slider.addEventListener("mouseup", persistWeightsIfChanged);
    slider.addEventListener("touchend", persistWeightsIfChanged, { passive: true });
    slider.addEventListener("keyup", (event) => {
      if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End" || event.key === "PageUp" || event.key === "PageDown") {
        persistWeightsIfChanged();
      }
    });
  });

  root.querySelector("#reset-weights")?.addEventListener("click", () => actions.onScoreWeightsReset());
  root.querySelector("#export-progress")?.addEventListener("click", () => actions.onExportProgress());

  const importInput = root.querySelector("#import-progress-input");
  root.querySelector("#import-progress-trigger")?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", (event) => actions.onImportProgressFile(event));

  root.querySelector("#reset-project")?.addEventListener("click", () => actions.onResetProject());
}
