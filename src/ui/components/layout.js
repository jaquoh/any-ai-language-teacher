export function renderShell(activeRoute, contentHtml) {
  const links = [
    { href: "#/", id: "dashboard", label: "Dashboard" },
    { href: "#/prompt", id: "promptBuilder", label: "Prompt Builder" },
    { href: "#/import", id: "importResult", label: "Import Result" },
    { href: "#/lessons", id: "lessons", label: "Lessons" },
    { href: "#/knowledge", id: "knowledge", label: "Knowledge" },
    { href: "#/plan", id: "plan", label: "Plan" },
    { href: "#/settings", id: "settings", label: "Settings" },
    { href: "#/about", id: "about", label: "About" },
  ];

  const navHtml = links
    .map((link) => {
      const active = activeRoute === link.id;
      return `<a class="btn btn-sm ${active ? "btn-primary" : "btn-ghost"}" href="${link.href}">${link.label}</a>`;
    })
    .join("\n");

  return `
    <div class="app-shell min-h-screen bg-gradient-to-br from-brand-100 via-base-100 to-brand-50 text-neutral">
      <header class="border-b border-brand-200 bg-base-100/90 backdrop-blur">
        <div class="mx-auto max-w-6xl px-4 py-4">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 class="text-2xl font-bold tracking-tight">Portable AI Language Teacher</h1>
              <p class="text-sm opacity-80">A beautiful, portable learning journey across any AI chat</p>
            </div>
            <nav class="flex flex-wrap gap-2 rounded-2xl border border-brand-200 bg-base-100/80 p-2 shadow-sm">${navHtml}</nav>
          </div>
        </div>
      </header>
      <main class="mx-auto max-w-6xl px-4 py-6">${contentHtml}</main>
    </div>
  `;
}

export function statCard(label, value, helper = "") {
  return `
    <section class="card bg-base-100 shadow-md border border-brand-100">
      <div class="card-body">
        <h2 class="text-sm uppercase tracking-wide opacity-70">${label}</h2>
        <p class="text-3xl font-semibold">${value}</p>
        <p class="text-xs opacity-70">${helper}</p>
      </div>
    </section>
  `;
}

export function sectionCard(title, bodyHtml) {
  return `
    <section class="card bg-base-100 shadow-md border border-brand-100">
      <div class="card-body">
        <h2 class="card-title">${title}</h2>
        ${bodyHtml}
      </div>
    </section>
  `;
}
