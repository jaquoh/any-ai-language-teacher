import { sectionCard } from "../components/layout.js";
import { buildVerbSpeechText } from "../../core/speech.js";

function escapeAttr(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function speakButton({ text, lang, label, title }) {
  return `<button class="btn btn-xs btn-outline" aria-label="${escapeAttr(label)}" title="${escapeAttr(title)}" data-speak-text="${escapeAttr(
    text,
  )}" data-speak-lang="${escapeAttr(lang)}">&#128266; ${escapeAttr(label)}</button>`;
}

function renderVocabularyRows(vocabulary) {
  return vocabulary
    .map((item) => {
      const termSpeak = speakButton({
        text: item.term,
        lang: "de-DE",
        label: "DE",
        title: "Play German pronunciation",
      });

      const translationSpeak = speakButton({
        text: item.translation,
        lang: "en-US",
        label: "EN",
        title: "Play English pronunciation",
      });

      return `<tr>
        <td class="font-medium">${item.term}</td>
        <td>${item.translation}</td>
        <td>${Math.round(item.mastery)}</td>
        <td class="text-xs opacity-80">${item.lastSeen}</td>
        <td><div class="flex flex-wrap gap-1">${termSpeak}${translationSpeak}</div></td>
      </tr>`;
    })
    .join("");
}

function renderVerbRows(verbs) {
  return verbs
    .map((item) => {
      const conjugationSpeech = buildVerbSpeechText(item);
      const speakVerb = speakButton({
        text: conjugationSpeech,
        lang: "de-DE",
        label: "Conjugation",
        title: "Play full conjugation",
      });

      return `<tr>
        <td class="font-medium">${item.infinitive}</td>
        <td>${item.present.ich}</td>
        <td>${item.present.du}</td>
        <td>${item.present.er_sie_es}</td>
        <td>${item.present.wir}</td>
        <td>${item.present.ihr}</td>
        <td>${item.present.sie_Sie}</td>
        <td>${Math.round(item.mastery)}</td>
        <td>${speakVerb}</td>
      </tr>`;
    })
    .join("");
}

function renderGrammarRows(grammar) {
  return grammar
    .map(
      (item) =>
        `<tr><td>${item.id}</td><td>${item.name}</td><td>${item.example}</td><td>${Math.round(item.mastery)}</td></tr>`,
    )
    .join("");
}

export function renderKnowledge(state) {
  const ledger = state.progress.knowledgeLedger;

  return `
    <div class="grid gap-4">
      ${sectionCard(
        "Vocabulary",
        ledger.vocabulary.length
          ? `<div class="overflow-x-auto"><table class="table table-zebra table-sm"><thead><tr><th>Term</th><th>Translation</th><th>Mastery</th><th>Last Seen</th><th>Audio</th></tr></thead><tbody>${renderVocabularyRows(
              ledger.vocabulary,
            )}</tbody></table></div>`
          : "<p class='text-sm opacity-80'>No vocabulary imported yet.</p>",
      )}

      ${sectionCard(
        "Verbs",
        ledger.verbs.length
          ? `<div class="overflow-x-auto"><table class="table table-zebra table-sm"><thead><tr><th>Infinitive</th><th>ich</th><th>du</th><th>er/sie/es</th><th>wir</th><th>ihr</th><th>sie/Sie</th><th>Mastery</th><th>Audio</th></tr></thead><tbody>${renderVerbRows(
              ledger.verbs,
            )}</tbody></table></div>`
          : "<p class='text-sm opacity-80'>No verbs imported yet.</p>",
      )}

      ${sectionCard(
        "Grammar",
        ledger.grammar.length
          ? `<div class="overflow-x-auto"><table class="table table-zebra table-sm"><thead><tr><th>ID</th><th>Name</th><th>Example</th><th>Mastery</th></tr></thead><tbody>${renderGrammarRows(
              ledger.grammar,
            )}</tbody></table></div>`
          : "<p class='text-sm opacity-80'>No grammar points imported yet.</p>",
      )}
    </div>
  `;
}

export function bindKnowledgeEvents(root, actions) {
  root.querySelectorAll("[data-speak-text]").forEach((button) => {
    button.addEventListener("click", () => {
      actions.onSpeakText(button.getAttribute("data-speak-text") || "", button.getAttribute("data-speak-lang") || "de-DE");
    });
  });
}
