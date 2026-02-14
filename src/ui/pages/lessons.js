import { sectionCard } from "../components/layout.js";

export function renderLessons(state) {
  if (!state.progress.lessonHistory.length) {
    return sectionCard("Imported Lessons", "<p class='text-sm opacity-80'>No lessons imported yet.</p>");
  }

  const rows = state.progress.lessonHistory
    .slice()
    .reverse()
    .map(
      (entry) => `
      <tr>
        <td class="font-mono text-xs">${entry.resultId}</td>
        <td>${entry.moduleId}</td>
        <td>${entry.topic}</td>
        <td>${entry.lessonScore}</td>
        <td class="max-w-xl">${entry.summary}</td>
      </tr>
    `,
    )
    .join("");

  return sectionCard(
    "Imported Lessons",
    `
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm">
          <thead><tr><th>Result ID</th><th>Module</th><th>Topic</th><th>Score</th><th>Summary</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `,
  );
}
