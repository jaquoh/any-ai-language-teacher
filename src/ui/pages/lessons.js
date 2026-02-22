function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseTimestamp(value) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatLocalDateTime(value) {
  const date = parseTimestamp(value);
  if (!date) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(durationMin) {
  const value = Number(durationMin);
  if (Number.isInteger(value) && value > 0) {
    return `${value} min`;
  }
  return "n/a";
}

function classifyTimeOfDay(date) {
  const hour = date.getHours();
  if (hour < 6) {
    return "Night";
  }
  if (hour < 12) {
    return "Morning";
  }
  if (hour < 18) {
    return "Afternoon";
  }
  return "Evening";
}

function buildTimeOfDaySummary(entries) {
  const tally = new Map([
    ["Morning", 0],
    ["Afternoon", 0],
    ["Evening", 0],
    ["Night", 0],
  ]);

  for (const entry of entries) {
    const date = parseTimestamp(entry.timestamp);
    if (!date) {
      continue;
    }
    const bucket = classifyTimeOfDay(date);
    tally.set(bucket, (tally.get(bucket) || 0) + 1);
  }

  return Array.from(tally.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function renderSummaryChips(entries) {
  const timeSummary = buildTimeOfDaySummary(entries);
  return timeSummary
    .filter((item) => item.count > 0)
    .slice(0, 3)
    .map(
      (item, index) =>
        `<span class="rounded-full border px-2.5 py-1 text-xs ${index === 0 ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}">${escapeHtml(item.label)}: ${item.count}</span>`,
    )
    .join("");
}

function stepState(loop, key, prerequisiteDone) {
  if (loop?.[key]) {
    return "done";
  }
  return prerequisiteDone ? "current" : "pending";
}

function statusBadge(label, state) {
  const classes =
    state === "done"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/70 dark:bg-emerald-950 dark:text-emerald-300"
      : state === "current"
        ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700/70 dark:bg-brand-950 dark:text-brand-300"
        : "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

  return `<span class="rounded-full border px-2 py-1 text-[11px] font-medium ${classes}">${escapeHtml(label)}: ${state}</span>`;
}

function renderLoopState(loop) {
  const step1 = stepState(loop, "promptReady", true);
  const step2 = stepState(loop, "lessonDone", loop?.promptReady);
  const step3 = stepState(loop, "resultImported", loop?.promptReady && loop?.lessonDone);

  return `
    <div class="mt-2 flex flex-wrap gap-2">
      ${statusBadge("Step 1", step1)}
      ${statusBadge("Step 2", step2)}
      ${statusBadge("Step 3", step3)}
    </div>
  `;
}

function renderLessonEntry(entry, index) {
  const aiModel = entry.aiSource?.model || "unknown";
  return `
    <li class="relative ms-6 pb-6">
      <span class="absolute -start-6 mt-1.5 flex size-5 items-center justify-center rounded-full border border-brand-300 bg-brand-100 text-[10px] font-semibold text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200">${index + 1}</span>
      <details class="group rounded-xl border border-slate-200 bg-white/85 shadow-sm transition hover:shadow dark:border-slate-800 dark:bg-slate-900/70">
        <summary class="flex cursor-pointer list-none items-start justify-between gap-3 p-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">${escapeHtml(formatLocalDateTime(entry.timestamp))}</span>
              <span class="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">${formatDuration(entry.durationMin)}</span>
              <span class="rounded-full bg-brand-100 px-2 py-1 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">Score ${Math.round(entry.lessonScore || 0)}</span>
            </div>
            <p class="mt-2 text-sm font-medium">${escapeHtml(entry.topic)}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(entry.moduleId)} - ${escapeHtml(aiModel)}</p>
          </div>
          <span class="mt-1 inline-flex size-8 items-center justify-center text-slate-600 transition-transform duration-200 group-open:rotate-180 dark:text-slate-300" aria-hidden="true">
            <svg viewBox="0 0 20 20" class="size-5" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 7l6 6 6-6"></path>
            </svg>
          </span>
        </summary>
        <div class="border-t border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
          <p><span class="font-medium">Result ID:</span> <span class="font-mono text-xs">${escapeHtml(entry.resultId)}</span></p>
          <p class="mt-2"><span class="font-medium">Summary:</span> ${escapeHtml(entry.summary)}</p>
        </div>
      </details>
    </li>
  `;
}

function renderPendingLesson(nextLesson, loopState, index) {
  return `
    <li class="relative ms-6 pb-1">
      <span class="absolute -start-6 mt-1.5 flex size-5 items-center justify-center rounded-full border border-sky-300 bg-sky-100 text-[10px] font-semibold text-sky-700 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200">${index + 1}</span>
      <article class="rounded-xl border border-dashed border-sky-300 bg-sky-50/80 p-3 shadow-sm dark:border-sky-700/60 dark:bg-sky-950/30">
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="rounded-full bg-white px-2 py-1 text-slate-700 dark:bg-slate-900 dark:text-slate-200">Current Pending Lesson</span>
        </div>
        <p class="mt-2 text-sm font-medium">${escapeHtml(nextLesson?.topic || "next topic")}</p>
        <p class="text-xs text-slate-600 dark:text-slate-300">${escapeHtml(nextLesson?.moduleId || "module pending")}</p>
        <p class="mt-2 text-xs text-slate-600 dark:text-slate-300">${escapeHtml(nextLesson?.notes || "Generate prompt to start this lesson loop.")}</p>
        ${renderLoopState(loopState)}
      </article>
    </li>
  `;
}

function renderTimeline(history, nextLesson, loopState) {
  const ordered = history
    .slice()
    .sort((a, b) => {
      const aTime = parseTimestamp(a.timestamp)?.getTime() || 0;
      const bTime = parseTimestamp(b.timestamp)?.getTime() || 0;
      return aTime - bTime;
    });

  const points = ordered.map((entry, index) => renderLessonEntry(entry, index)).join("");
  const pendingPoint = renderPendingLesson(nextLesson, loopState, ordered.length);
  const chips = ordered.length ? renderSummaryChips(ordered) : "";

  return `
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-lg font-semibold">Lesson Timeline</h2>
      <div class="flex flex-wrap gap-2">${chips}</div>
    </div>
    ${ordered.length ? "" : "<p class='mb-3 text-sm text-slate-500 dark:text-slate-400'>No completed lessons yet. Start with the pending lesson below.</p>"}
    <ol class="border-s border-slate-200 ps-1 dark:border-slate-700">
      ${points}
      ${pendingPoint}
    </ol>
  `;
}

export function renderLessons(state) {
  const history = state.progress.lessonHistory || [];
  const nextLesson = state.progress.nextLesson || null;
  const loopState = state.lessonLoop || null;

  return `
    <section class="rounded-2xl border border-slate-200 bg-base-100/90 p-4 dark:border-slate-800">
      ${renderTimeline(history, nextLesson, loopState)}
    </section>
  `;
}
