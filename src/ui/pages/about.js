import { sectionCard } from "../components/layout.js";

export function renderAbout() {
  return sectionCard(
    "About This Project",
    `
      <p class="text-sm mb-3">
        This tool lets learners carry language-learning progress between AI chats without preserving chat history.
        The app generates a strict lesson packet, receives structured LessonResultData, validates it, and updates ProgressData.
      </p>
      <ul class="list-disc pl-5 text-sm space-y-1">
        <li>Offline-first: no backend required.</li>
        <li>Strict schema contracts: malformed lesson data is rejected safely.</li>
        <li>Built-in repair prompt flow: recover quickly from invalid AI output.</li>
        <li>Deterministic scoring with adjustable weighting and full-history recompute.</li>
      </ul>
    `,
  );
}
