import { sectionCard, statCard } from "../components/layout.js";

function motivationalMessage(progress) {
  const lessons = progress.lessonHistory.length;
  const trend = progress.scorecard.trend;

  if (!lessons) {
    return "Your journey starts now. The first lesson is themed around love and Valentine's Day, so you can build confidence with emotional, real-world language from the start.";
  }

  if (trend === "up") {
    return "Great momentum. Your recent lessons are trending up, so keep the rhythm and build on this streak.";
  }

  if (trend === "down") {
    return "Progress includes plateaus. You already built a base, and one focused lesson can turn the trend back up.";
  }

  return "You are building consistency. Keep going with one focused lesson and your confidence will compound.";
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

function scoreLineChart(history) {
  if (!history.length) {
    return `<div class="rounded-2xl border border-dashed border-brand-300 p-4 text-sm opacity-80">No lesson scores yet. Import your first lesson result to start the chart.</div>`;
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
      return `<circle cx="${x}" cy="${y}" r="3.5" fill="#e11d48" />`;
    })
    .join("");

  return `
    <div class="rounded-2xl bg-base-100/60 p-3">
      <svg viewBox="0 0 ${width} ${height}" class="h-48 w-full">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#fbcfe8" stroke-width="2" />
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#fbcfe8" stroke-width="2" />
        <polyline fill="none" stroke="#e11d48" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${points}" />
        ${bars}
      </svg>
      <p class="mt-1 text-xs opacity-70">Lesson score trajectory (last ${values.length})</p>
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
      ? `Focus areas right now: <span class="font-semibold">${weakCount}</span> active practice targets`
      : "No active weak-area flags right now. Keep reinforcing new material.",
  ];
}

function factorBars(factors) {
  return Object.entries(factors)
    .map(
      ([key, value]) => `
      <div class="space-y-1">
        <div class="flex items-center justify-between text-sm">
          <span class="capitalize">${key}</span>
          <span class="font-medium">${Math.round(value)}</span>
        </div>
        <progress class="progress progress-primary h-3 w-full" value="${Math.round(value)}" max="100"></progress>
      </div>
    `,
    )
    .join("");
}

export function renderDashboard(state) {
  const { scorecard, lessonHistory, nextLesson } = state.progress;
  const factors = latestFactors(state.progress);
  const insights = insightList(state.progress).map((line) => `<li>${line}</li>`).join("");

  return `
    <section class="hero rounded-3xl border border-brand-200 bg-gradient-to-r from-brand-50 via-base-100 to-brand-100 shadow-lg">
      <div class="hero-content w-full justify-between px-6 py-8">
        <div>
          <h2 class="text-3xl font-bold tracking-tight">Keep Your Language Momentum Going</h2>
          <p class="mt-2 max-w-2xl text-sm opacity-80">${motivationalMessage(state.progress)}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <a class="btn btn-primary btn-sm" href="#/prompt">Plan Next Lesson</a>
            <a class="btn btn-outline btn-sm" href="#/import">Import Lesson Result</a>
            <a class="btn btn-ghost btn-sm" href="#/settings">Open Settings</a>
          </div>
        </div>
      </div>
    </section>

    <div class="mt-6 grid gap-4 md:grid-cols-3">
      ${statCard("Overall Score", scorecard.overallScore, "Recomputed from all imported lessons")}
      ${statCard("CEFR Estimate", scorecard.cefrEstimate.band, `Confidence ${Math.round(scorecard.cefrEstimate.confidence * 100)}%`) }
      ${statCard("Lessons Completed", lessonHistory.length, `Trend: ${scorecard.trend}`)}
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-2">
      ${sectionCard(
        "Progress Chart",
        `${scoreLineChart(lessonHistory)}
         <p class="mt-3 text-sm opacity-80">Tip: finish one more lesson to smooth out trend accuracy and confidence estimates.</p>`,
      )}

      ${sectionCard(
        "Skill Balance Snapshot",
        `${factorBars(factors)}
         <p class="mt-3 text-xs opacity-70">Based on your most recently imported lesson.</p>`,
      )}

      ${sectionCard(
        "Motivating Insights",
        `<ul class="list-disc space-y-2 pl-5 text-sm">${insights}</ul>`,
      )}

      ${sectionCard(
        "Next Lesson Focus",
        `<ul class="space-y-1 text-sm">
          <li><span class="font-medium">Module:</span> ${nextLesson.moduleId}</li>
          <li><span class="font-medium">Topic:</span> ${nextLesson.topic}</li>
          <li><span class="font-medium">Grammar:</span> ${nextLesson.grammarFocus.join(", ")}</li>
          <li><span class="font-medium">Verbs:</span> ${nextLesson.verbFocus.join(", ")}</li>
          <li><span class="font-medium">Vocabulary:</span> ${nextLesson.vocabularyFocus.join(", ")}</li>
          <li class="pt-2 opacity-80">${nextLesson.notes}</li>
        </ul>`,
      )}
    </div>
  `;
}

export function bindDashboardEvents() {
  // Dashboard is intentionally read-first and motivational. Settings controls moved to Settings page.
}
