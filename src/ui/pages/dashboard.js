import { sectionCard, statCard } from "../components/layout.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJsonString(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');
}

function motivationalMessage(progress) {
  const lessons = progress.lessonHistory.length;
  const trend = progress.scorecard.trend;

  if (!lessons) {
    return "Start with your first prompt, run the lesson in your AI chat, then import the JSON result to build momentum.";
  }

  if (trend === "up") {
    return "Your latest scores are trending up. Keep the same rhythm and lock in another clean session.";
  }

  if (trend === "down") {
    return "Small dips are normal. One focused loop usually stabilizes the trend quickly.";
  }

  return "Consistency is working. Keep running the 3-step lesson loop.";
}

function latestFactors(progress) {
  const latest = progress.lessonHistory[progress.lessonHistory.length - 1];
  if (!latest?.factors) {
    return {
      grammar: 0,
      verbs: 0,
      vocabulary: 0,
      fluency: 0,
    };
  }

  return latest.factors;
}

function formatLocalDateTime(value) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function scoreLineChart(history) {
  if (!history.length) {
    return `<div class="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No lesson scores yet. Import your first lesson result to start the chart.</div>`;
  }

  const values = history.slice(-10).map((entry) => Number(entry.lessonScore || 0));
  const width = 560;
  const height = 180;
  const padding = 18;
  const xStep = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  const points = values
    .map((value, index) => {
      const x = padding + xStep * index;
      const y = height - padding - (value / 100) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const bars = values
    .map((value, index) => {
      const x = padding + xStep * index;
      const y = height - padding - (value / 100) * (height - padding * 2);
      return `<circle cx="${x}" cy="${y}" r="3.5" fill="#d82960" />`;
    })
    .join("");

  return `
    <div class="rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <svg viewBox="0 0 ${width} ${height}" class="h-44 w-full">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#fecdd3" stroke-width="2" />
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#fecdd3" stroke-width="2" />
        <polyline fill="none" stroke="#d82960" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${points}" />
        ${bars}
      </svg>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Lesson score trajectory (last ${values.length})</p>
    </div>
  `;
}

function insightList(progress) {
  const vocabCount = progress.knowledgeLedger.vocabulary.length;
  const verbCount = progress.knowledgeLedger.verbs.length;
  const grammarCount = progress.knowledgeLedger.grammar.length;
  const weakCount = progress.mistakePatterns.filter((item) => item.needsPractice).length;

  return [
    `Vocabulary bank: <span class="font-semibold">${vocabCount}</span> tracked items`,
    `Verb memory: <span class="font-semibold">${verbCount}</span> verbs with conjugations`,
    `Grammar confidence: <span class="font-semibold">${grammarCount}</span> grammar entries`,
    weakCount
      ? `Active focus areas: <span class="font-semibold">${weakCount}</span>`
      : "No active weak-area flags right now.",
  ];
}

function factorBars(factors) {
  return Object.entries(factors)
    .map(([key, value]) => {
      const score = Math.round(value);
      return `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-sm">
            <span class="capitalize">${escapeHtml(key)}</span>
            <span class="font-medium">${score}</span>
          </div>
          <div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div class="h-full rounded-full bg-brand-600 transition-all" style="width: ${score}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderRecentTimeline(lessonHistory) {
  if (!lessonHistory.length) {
    return "<p class='text-sm text-slate-500 dark:text-slate-400'>No lessons imported yet.</p>";
  }

  return lessonHistory
    .slice()
    .reverse()
    .slice(0, 5)
    .map(
      (entry) => `
        <li class="relative flex gap-x-3">
          <div class="absolute start-0 top-0 flex h-full w-6 justify-center">
            <div class="h-full w-px bg-slate-200 dark:bg-slate-700"></div>
          </div>
          <div class="relative z-10 mt-1.5 size-3 rounded-full bg-brand-500"></div>
          <div class="pb-5 text-sm">
            <p class="font-medium">${escapeHtml(entry.topic)}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(formatLocalDateTime(entry.timestamp))} - Score ${Math.round(entry.lessonScore || 0)}</p>
          </div>
        </li>
      `,
    )
    .join("");
}

function treeLeaf(label, value, isDir = false) {
  return `
    <li data-hs-tree-view-item='{"value":"${escapeJsonString(value)}","isDir":${isDir ? "true" : "false"}}' class="cursor-pointer rounded-lg px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
      ${escapeHtml(label)}
    </li>
  `;
}

function renderFocusTree(state) {
  const next = state.progress.nextLesson;
  const weakAreas = state.progress.mistakePatterns
    .filter((item) => item.needsPractice)
    .slice(0, 4)
    .map((item) => `${item.category}: ${item.key}`);

  const grammar = next.grammarFocus.map((item) => treeLeaf(item, `grammar-${item}`)).join("");
  const verbs = next.verbFocus.map((item) => treeLeaf(item, `verb-${item}`)).join("");
  const vocab = next.vocabularyFocus.map((item) => treeLeaf(item, `vocab-${item}`)).join("");
  const weak = weakAreas.length
    ? weakAreas.map((item) => treeLeaf(item, `weak-${item}`)).join("")
    : treeLeaf("No urgent weak area", "weak-none");

  return `
    <div data-hs-tree-view='{"controlBy":"button"}' class="space-y-2 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <p class="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Focus Tree</p>
      <ul class="space-y-1">
        <li data-hs-tree-view-item='{"value":"module","isDir":true}' class="rounded-lg px-2 py-1 text-sm font-medium">${escapeHtml(next.moduleId)} - ${escapeHtml(next.topic)}</li>
        <ul class="ms-4 space-y-1 border-s border-slate-200 ps-2 dark:border-slate-700">
          ${treeLeaf("Grammar", "branch-grammar", true)}
          <ul class="ms-3 space-y-1 border-s border-slate-200 ps-2 dark:border-slate-700">${grammar}</ul>
          ${treeLeaf("Verbs", "branch-verbs", true)}
          <ul class="ms-3 space-y-1 border-s border-slate-200 ps-2 dark:border-slate-700">${verbs}</ul>
          ${treeLeaf("Vocabulary", "branch-vocabulary", true)}
          <ul class="ms-3 space-y-1 border-s border-slate-200 ps-2 dark:border-slate-700">${vocab}</ul>
          ${treeLeaf("Weak Areas", "branch-weak", true)}
          <ul class="ms-3 space-y-1 border-s border-slate-200 ps-2 dark:border-slate-700">${weak}</ul>
        </ul>
      </ul>
    </div>
  `;
}

export function renderDashboard(state) {
  const { scorecard, lessonHistory, nextLesson } = state.progress;
  const factors = latestFactors(state.progress);
  const insights = insightList(state.progress).map((line) => `<li>${line}</li>`).join("");
  const loop = state.lessonLoop || {};
  const loopComplete = Boolean(loop.promptReady && loop.lessonDone && loop.resultImported);
  const highlightImport = Boolean(loop.promptReady) && !loopComplete;
  const highlightGenerate = !highlightImport;
  const generateBtnClass = highlightGenerate ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm";
  const importBtnClass = highlightImport ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm";

  return `
    <section class="rounded-3xl border border-brand-200 bg-gradient-to-r from-brand-50 via-base-100 to-sky-50 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div class="space-y-3">
        <h2 class="text-2xl font-bold tracking-tight">Keep Your Language Momentum Going</h2>
        <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">${motivationalMessage(state.progress)}</p>
        <div class="flex flex-wrap gap-2">
          <a class="${generateBtnClass}" href="#/prompt">Generate Prompt</a>
          <a class="${importBtnClass}" href="#/import">Import Result</a>
          <a class="btn btn-outline btn-sm" href="#/lessons">View Timeline</a>
        </div>
      </div>
    </section>

    <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      ${statCard("Overall Score", scorecard.overallScore, "Recomputed from all imported lessons")}
      ${statCard("CEFR Estimate", scorecard.cefrEstimate.band, `Confidence ${Math.round(scorecard.cefrEstimate.confidence * 100)}%`)}
      ${statCard("Lessons Completed", lessonHistory.length, `Trend: ${scorecard.trend}`)}
      ${statCard("Next Topic", nextLesson.topic, nextLesson.moduleId)}
    </div>

    <div class="mt-5 grid gap-4 xl:grid-cols-3">
      <div class="space-y-4 xl:col-span-2">
        ${sectionCard(
          "Progress Chart",
          `${scoreLineChart(lessonHistory)}
           <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">One more lesson in your current routine helps trend confidence settle faster.</p>`,
        )}
        ${sectionCard(
          "Recent Lesson Moments",
          `<ol>${renderRecentTimeline(lessonHistory)}</ol>`,
        )}
      </div>

      <div class="space-y-4">
        ${sectionCard(
          "Skill Balance Snapshot",
          `${factorBars(factors)}
           <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Based on your most recently imported lesson.</p>`,
        )}
        ${sectionCard("Next Lesson Focus Tree", renderFocusTree(state))}
      </div>
    </div>

    <div class="mt-5 grid gap-4 lg:grid-cols-2">
      ${sectionCard(
        "Motivating Insights",
        `<ul class="list-disc space-y-2 ps-5 text-sm">${insights}</ul>`,
      )}
      ${sectionCard(
        "Next Lesson Brief",
        `<ul class="space-y-1 text-sm">
          <li><span class="font-medium">Module:</span> ${escapeHtml(nextLesson.moduleId)}</li>
          <li><span class="font-medium">Topic:</span> ${escapeHtml(nextLesson.topic)}</li>
          <li><span class="font-medium">Grammar:</span> ${escapeHtml(nextLesson.grammarFocus.join(", "))}</li>
          <li><span class="font-medium">Verbs:</span> ${escapeHtml(nextLesson.verbFocus.join(", "))}</li>
          <li><span class="font-medium">Vocabulary:</span> ${escapeHtml(nextLesson.vocabularyFocus.join(", "))}</li>
          <li class="pt-2 text-slate-600 dark:text-slate-300">${escapeHtml(nextLesson.notes)}</li>
        </ul>`,
      )}
    </div>
  `;
}

export function bindDashboardEvents() {
  // Dashboard is read-first. Actions are handled via route links.
}
