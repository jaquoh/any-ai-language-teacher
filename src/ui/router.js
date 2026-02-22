const ROUTES = {
  "#/": "dashboard",
  "#/prompt": "promptBuilder",
  "#/ai-lesson": "aiLesson",
  "#/import": "importResult",
  "#/lessons": "lessons",
  "#/knowledge": "knowledge",
  "#/plan": "plan",
  "#/settings": "settings",
  "#/faq": "faq",
  "#/about": "about",
};

export function getCurrentRoute() {
  const hash = window.location.hash || "#/";
  return ROUTES[hash] || "dashboard";
}

export function routeLabel(routeId) {
  const labels = {
    dashboard: "Dashboard",
    promptBuilder: "Prompt Builder",
    aiLesson: "AI Lesson",
    importResult: "Import Result",
    lessons: "Lesson Timeline",
    knowledge: "Knowledge",
    plan: "Plan",
    settings: "Settings",
    faq: "FAQ",
    about: "About",
  };
  return labels[routeId] || "Dashboard";
}
