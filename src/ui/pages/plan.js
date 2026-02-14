import { sectionCard } from "../components/layout.js";
import { summarizeModuleProgress } from "../../core/topicSelector.js";

function renderList(items) {
  return `<ul class="list-disc pl-5 text-sm space-y-1">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function formatConjugation(verb) {
  const p = verb.present;
  return `${verb.infinitive}: ich ${p.ich}, du ${p.du}, er/sie/es ${p.er_sie_es}, wir ${p.wir}, ihr ${p.ihr}, sie/Sie ${p.sie_Sie}`;
}

function moduleProgress(module, lessonHistory) {
  const summary = summarizeModuleProgress(module, lessonHistory);
  return {
    lessonsCompleted: summary.lessonsCompleted,
    targetLessons: summary.targetLessons,
    completedTopicLessons: summary.completedTopicLessons,
    targetTopicLessons: summary.targetTopicLessons,
    lessonsPerTopic: summary.lessonsPerTopic,
    mastered: summary.moduleComplete,
  };
}

export function renderPlan(state) {
  const modules = state.plan.modules.slice().sort((a, b) => a.order - b.order);

  const cards = modules
    .map((module) => {
      const progress = moduleProgress(module, state.progress.lessonHistory || []);
      const mastered = progress.mastered;
      const cardClasses = mastered
        ? "card bg-emerald-50/70 border border-emerald-300 shadow-md dark:bg-emerald-950/25 dark:border-emerald-700/60"
        : "card bg-base-100 border border-brand-100 shadow-md";
      const badge = mastered
        ? `<span class="inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">&#10003; Mastered</span>`
        : `<span class="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">In progress</span>`;

      return `
      <article class="${cardClasses}">
        <div class="card-body">
          <div class="space-y-2">
            <h3 class="card-title">${module.cefr} - ${module.title}</h3>
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm opacity-80">Module ID: ${module.moduleId}</p>
                <p class="text-xs font-medium ${mastered ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300"}">Lesson cadence: ${progress.lessonsCompleted}/${progress.targetLessons}</p>
                <p class="text-xs font-medium ${mastered ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300"}">Topic repetitions: ${progress.completedTopicLessons}/${progress.targetTopicLessons} (${progress.lessonsPerTopic} per topic)</p>
              </div>
              <div class="shrink-0">${badge}</div>
            </div>
          </div>
          <div class="mt-2">
            <h4 class="font-semibold text-sm">Objectives</h4>
            ${renderList(module.lessonObjectives)}
          </div>
          <div class="mt-2">
            <h4 class="font-semibold text-sm">Topic Rotation</h4>
            ${renderList(module.vocabThemes)}
          </div>
          <div class="mt-2">
            <h4 class="font-semibold text-sm">Grammar Targets</h4>
            ${renderList(module.grammarTargets.map((item) => `${item.id}: ${item.name}`))}
          </div>
          <div class="mt-2">
            <h4 class="font-semibold text-sm">Verb Conjugations</h4>
            ${renderList(module.verbTargets.map((verb) => formatConjugation(verb)))}
          </div>
        </div>
      </article>
    `;
    })
    .join("");

  return sectionCard(
    "Learning Plan",
    `<p class="text-sm opacity-80 mb-4">Seed curriculum covers practical German from A1.1 to B1.2 with immigration-relevant topic rotation.</p>
     <div class="grid gap-4">${cards}</div>`,
  );
}
