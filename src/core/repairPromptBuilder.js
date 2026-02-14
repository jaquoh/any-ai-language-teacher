export function buildRepairPrompt(rawLessonResult, validationErrors) {
  const rows = (validationErrors || [])
    .map((error, index) => `${index + 1}. path=${error.path} keyword=${error.keyword} message=${error.message}`)
    .join("\n");

  return [
    "You are fixing malformed LessonResultData JSON.",
    "Return only one fenced JSON block and no extra text.",
    "Keep the same intent/content but correct structure and data types.",
    "",
    "Validation errors:",
    rows || "No detailed errors provided.",
    "",
    "Original payload:",
    "```",
    String(rawLessonResult || ""),
    "```",
    "",
    "Now return corrected LessonResultData as:",
    "```json",
    "{ ... }",
    "```",
  ].join("\n");
}
