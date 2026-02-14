const ROUTES = {
  "#/": "dashboard",
  "#/prompt": "promptBuilder",
  "#/import": "importResult",
  "#/lessons": "lessons",
  "#/knowledge": "knowledge",
  "#/plan": "plan",
  "#/settings": "settings",
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
    importResult: "Import Result",
    lessons: "Lessons",
    knowledge: "Knowledge",
    plan: "Plan",
    settings: "Settings",
    about: "About",
  };
  return labels[routeId] || "Dashboard";
}
