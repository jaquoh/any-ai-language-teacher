import { sectionCard } from "../components/layout.js";
import { normalizeWeights } from "../../core/scoringEngine.js";

const WEIGHT_KEYS = ["grammar", "verbs", "vocabulary", "fluency"];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) {
    return "U";
  }
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function renderAvatar(userName, avatarUrl) {
  if (avatarUrl) {
    return `<img src="${escapeHtml(avatarUrl)}" alt="Profile image" class="size-16 rounded-2xl border border-slate-200 object-cover dark:border-slate-700" />`;
  }
  return `<div class="inline-flex size-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">${escapeHtml(initialsFromName(userName))}</div>`;
}

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

export function renderSettings(state, options = {}) {
  const weights = toPercentWeights(state.progress.scoreConfig.weights);
  const syncMessage = options.serverSyncEnabled
    ? "Progress auto-saves in this browser and syncs to your server profile."
    : "Progress auto-saves in this browser (localStorage). Import/export is still available for backup and moving to another device.";
  const account = options.account || null;

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

  const accountProfileCard = account
    ? sectionCard(
        "Account Profile",
        `<form id="account-profile-form" class="space-y-3">
           <div class="flex items-center gap-3">
             ${renderAvatar(account.userName, account.avatarUrl)}
             <div>
               <p class="text-sm font-semibold">${escapeHtml(account.userName || "User")}</p>
               <p class="text-xs opacity-70">Profile image is stored as a URL on your account.</p>
             </div>
           </div>
           <label class="form-control">
             <div class="label">
               <span class="label-text">User Name</span>
             </div>
             <input id="account-user-name" name="name" type="text" autocomplete="username" minlength="3" maxlength="40" value="${escapeHtml(account.userName || "")}" class="input input-bordered w-full" />
             <div class="label">
               <span class="label-text-alt">Used for login. Allowed: letters, numbers, dot, underscore, hyphen.</span>
             </div>
           </label>
           <label class="form-control">
             <div class="label">
               <span class="label-text">Profile Image URL</span>
             </div>
             <input id="account-avatar-url" name="avatarUrl" type="url" inputmode="url" placeholder="https://example.com/avatar.jpg" value="${escapeHtml(account.avatarUrl || "")}" class="input input-bordered w-full" />
           </label>
           ${
             account.profileMessage
               ? `<p class="rounded-lg border px-3 py-2 text-sm ${account.profileMessage.ok ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"}">${escapeHtml(account.profileMessage.text)}</p>`
               : ""
           }
           <div class="flex flex-wrap gap-2">
             <button type="submit" class="btn btn-sm btn-primary" ${account.profileBusy ? "disabled" : ""}>${account.profileBusy ? "Saving..." : "Save Profile"}</button>
             <button type="button" id="account-avatar-clear" class="btn btn-sm btn-outline" ${account.profileBusy ? "disabled" : ""}>Clear Image</button>
           </div>
         </form>`,
      )
    : sectionCard(
        "Account Profile",
        `<p class="text-sm opacity-80">Account profile features (profile image, password change) are available when server sync/login is enabled.</p>`,
      );

  const accountSecurityCard = account
    ? sectionCard(
        "Change Password",
        `<form id="account-password-form" class="space-y-3">
           <label class="form-control">
             <div class="label"><span class="label-text">Current Password</span></div>
             <input name="currentPassword" type="password" autocomplete="current-password" class="input input-bordered w-full" required minlength="8" maxlength="120" />
           </label>
           <label class="form-control">
             <div class="label"><span class="label-text">New Password</span></div>
             <input name="newPassword" type="password" autocomplete="new-password" class="input input-bordered w-full" required minlength="8" maxlength="120" />
           </label>
           <label class="form-control">
             <div class="label"><span class="label-text">Confirm New Password</span></div>
             <input name="confirmPassword" type="password" autocomplete="new-password" class="input input-bordered w-full" required minlength="8" maxlength="120" />
           </label>
           ${
             account.passwordMessage
               ? `<p class="rounded-lg border px-3 py-2 text-sm ${account.passwordMessage.ok ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"}">${escapeHtml(account.passwordMessage.text)}</p>`
               : ""
           }
           <button type="submit" class="btn btn-sm btn-primary" ${account.passwordBusy ? "disabled" : ""}>${account.passwordBusy ? "Updating..." : "Update Password"}</button>
         </form>`,
      )
    : sectionCard(
        "Account Security",
        `<p class="text-sm opacity-80">Log in with server sync enabled to change password and manage your account profile.</p>`,
      );

  const helpCard = sectionCard(
    "FAQ & Help",
    `<p class="text-sm opacity-80 mb-3">Need instructions for the app loop, AI lesson page, password changes, or migrating progress to another account?</p>
     <a href="#/faq" class="btn btn-sm btn-outline">Open FAQ</a>`,
  );

  return `
    <div class="space-y-5">
      <section class="rounded-2xl border border-slate-200 bg-base-100/90 p-4 dark:border-slate-800">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Preferences</p>
            <h2 class="text-lg font-semibold">App Settings</h2>
          </div>
          <span class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Local app behavior + learning config</span>
        </div>
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
            `<p class="text-sm opacity-80 mb-3">${syncMessage}</p>
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
      </section>

      <section class="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/50 to-base-100 p-4 dark:border-brand-900/50 dark:from-slate-900 dark:to-slate-950">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-xs uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">Account</p>
            <h2 class="text-lg font-semibold">Account Settings</h2>
          </div>
          <span class="rounded-full border border-brand-200 bg-white/80 px-2.5 py-1 text-xs text-brand-700 dark:border-brand-800 dark:bg-slate-900 dark:text-brand-300">Login profile + security</span>
        </div>
        <div class="grid gap-4 lg:grid-cols-2">
          ${accountProfileCard}
          ${accountSecurityCard}
          ${helpCard}
        </div>
      </section>
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

  root.querySelector("#account-profile-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    actions.onSaveAccountProfile({
      name: String(data.get("name") || "").trim(),
      avatarUrl: String(data.get("avatarUrl") || "").trim(),
    });
  });

  root.querySelector("#account-avatar-clear")?.addEventListener("click", () => {
    const input = root.querySelector("#account-avatar-url");
    if (input) {
      input.value = "";
    }
    const nameInput = root.querySelector("#account-user-name");
    actions.onSaveAccountProfile({
      name: nameInput ? String(nameInput.value || "").trim() : "",
      avatarUrl: "",
    });
  });

  root.querySelector("#account-password-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    actions.onChangeAccountPassword({
      currentPassword: String(data.get("currentPassword") || ""),
      newPassword: String(data.get("newPassword") || ""),
      confirmPassword: String(data.get("confirmPassword") || ""),
    });
  });
}
