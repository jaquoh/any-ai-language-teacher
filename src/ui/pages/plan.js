import { sectionCard } from "../components/layout.js";

function renderList(items) {
  return `<ul class="list-disc pl-5 text-sm space-y-1">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function formatConjugation(verb) {
  const p = verb.present;
  return `${verb.infinitive}: ich ${p.ich}, du ${p.du}, er/sie/es ${p.er_sie_es}, wir ${p.wir}, ihr ${p.ihr}, sie/Sie ${p.sie_Sie}`;
}

export function renderPlan(state) {
  const modules = state.plan.modules.slice().sort((a, b) => a.order - b.order);

  const cards = modules
    .map(
      (module) => `
      <article class="card bg-base-100 border border-brand-100 shadow-md">
        <div class="card-body">
          <h3 class="card-title">${module.cefr} - ${module.title}</h3>
          <p class="text-sm opacity-80">Module ID: ${module.moduleId}</p>
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
    `,
    )
    .join("");

  return sectionCard(
    "Learning Plan",
    `<p class="text-sm opacity-80 mb-4">Seed curriculum covers practical German from A1.1 to B1.2 with immigration-relevant topic rotation.</p>
     <div class="grid gap-4">${cards}</div>`,
  );
}
