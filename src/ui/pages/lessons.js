import { sectionCard } from "../components/layout.js";

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

function renderTimeline(entries) {
  const ordered = entries
    .slice()
    .sort((a, b) => {
      const aTime = parseTimestamp(a.timestamp)?.getTime() || 0;
      const bTime = parseTimestamp(b.timestamp)?.getTime() || 0;
      return aTime - bTime;
    });

  const timeSummary = buildTimeOfDaySummary(ordered);
  const chips = timeSummary
    .filter((item) => item.count > 0)
    .slice(0, 3)
    .map(
      (item, index) =>
        `<span class="rounded-full border px-2.5 py-1 text-xs ${index === 0 ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-200" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}">${escapeHtml(item.label)}: ${item.count}</span>`,
    )
    .join("");

  const points = ordered
    .map((entry, index) => {
      const aiModel = entry.aiSource?.model || "unknown";
      return `
        <li class="relative ms-6 pb-6">
          <span class="absolute -start-6 mt-1.5 flex size-5 items-center justify-center rounded-full border border-brand-300 bg-brand-100 text-[10px] font-semibold text-brand-700 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200">${index + 1}</span>
          <div class="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">${escapeHtml(formatLocalDateTime(entry.timestamp))}</span>
              <span class="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">${formatDuration(entry.durationMin)}</span>
              <span class="rounded-full bg-brand-100 px-2 py-1 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">Score ${Math.round(entry.lessonScore || 0)}</span>
            </div>
            <p class="mt-2 text-sm font-medium">${escapeHtml(entry.topic)}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(entry.moduleId)} - ${escapeHtml(aiModel)}</p>
          </div>
        </li>
      `;
    })
    .join("");

  return `
    <section class="rounded-2xl border border-slate-200 bg-base-100/90 p-4 dark:border-slate-800">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold">Lesson Timeline</h3>
        <div class="flex flex-wrap gap-2">${chips}</div>
      </div>
      <ol class="border-s border-slate-200 ps-1 dark:border-slate-700">${points}</ol>
    </section>
  `;
}

export function renderLessons(state) {
  if (!state.progress.lessonHistory.length) {
    return sectionCard("Imported Lessons", "<p class='text-sm opacity-80'>No lessons imported yet.</p>");
  }

  const timeline = renderTimeline(state.progress.lessonHistory);
  const rows = state.progress.lessonHistory
    .slice()
    .reverse()
    .map(
      (entry) => `
      <tr>
        <td class="font-mono text-xs">${escapeHtml(entry.resultId)}</td>
        <td>${escapeHtml(formatLocalDateTime(entry.timestamp))}</td>
        <td>${escapeHtml(formatDuration(entry.durationMin))}</td>
        <td>${escapeHtml(entry.moduleId)}</td>
        <td>${escapeHtml(entry.topic)}</td>
        <td>${Math.round(entry.lessonScore || 0)}</td>
        <td>${escapeHtml(entry.aiSource?.model || "unknown")}</td>
        <td class="max-w-xl">${escapeHtml(entry.summary)}</td>
      </tr>
    `,
    )
    .join("");

  return sectionCard(
    "Imported Lessons",
    `
      ${timeline}
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm">
          <thead><tr><th>Result ID</th><th>Date & Time</th><th>Duration</th><th>Module</th><th>Topic</th><th>Score</th><th>AI Model</th><th>Summary</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `,
  );
}
