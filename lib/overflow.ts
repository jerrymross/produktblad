// This function intentionally has no imports or captured variables, so Puppeteer
// can run the exact same check in its PDF browser as the editor runs in preview.
export function measureSheetOverflow(): string[] {
  const root = document.querySelector<HTMLElement>(".sheet-page");
  if (!root) return ["blad"];
  const violations = new Set<string>();
  root.querySelectorAll<HTMLElement>(".sheet-column").forEach(column => {
    const limit = column.getBoundingClientRect().bottom + 0.5;
    column.querySelectorAll<HTMLElement>(".sheet-section").forEach(section => {
      if (section.getBoundingClientRect().bottom > limit) violations.add(section.dataset.field ?? "innehåll");
    });
  });
  const hero = root.querySelector<HTMLElement>(".sheet-hero");
  if (hero) {
    const heroLimit = hero.getBoundingClientRect().bottom;
    for (const key of ["eyebrow", "intro"]) {
      const item = root.querySelector<HTMLElement>(`[data-field="${key}"]`);
      if (item && (item.getBoundingClientRect().bottom > heroLimit || item.scrollWidth > item.clientWidth + 1)) violations.add(key);
    }
    const title = root.querySelector<HTMLElement>(".sheet-title");
    if (title && (title.scrollWidth > title.clientWidth + 1 || title.getBoundingClientRect().bottom > heroLimit)) violations.add("profession");
  }
  const pageBottom = root.getBoundingClientRect().bottom;
  const footer = root.querySelector<HTMLElement>(".sheet-footer");
  if (footer && footer.getBoundingClientRect().bottom > pageBottom - 2) violations.add("contactOneEmail");
  const about = root.querySelector<HTMLElement>(".sheet-about");
  if (about && footer && about.getBoundingClientRect().bottom > footer.getBoundingClientRect().top - 5) violations.add("about");
  root.querySelectorAll<HTMLElement>(".sheet-contact, .sheet-address").forEach(item => {
    if (item.scrollWidth > item.clientWidth + 1 || item.getBoundingClientRect().bottom > pageBottom - 2) violations.add(item.dataset.field ?? "address");
  });
  return [...violations];
}
