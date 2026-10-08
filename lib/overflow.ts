// This function intentionally has no imports or captured variables, so Puppeteer
// can run the exact same check in its PDF browser as the editor runs in preview.
export function measureSheetOverflow(): string[] {
  const root = document.querySelector<HTMLElement>(".sheet-page");
  if (!root) return ["blad"];
  const visualScale = root.getBoundingClientRect().width / parseFloat(getComputedStyle(root).width);
  const violations = new Set<string>();
  root.querySelectorAll<HTMLElement>(".sheet-column").forEach(column => {
    const limit = column.getBoundingClientRect().bottom + 0.5 * visualScale;
    column.querySelectorAll<HTMLElement>(".sheet-section").forEach(section => {
      if (section.getBoundingClientRect().bottom > limit) violations.add(section.dataset.field ?? "innehåll");
      const heading = section.querySelector<HTMLElement>("h2");
      if (heading && (heading.scrollWidth > heading.clientWidth + 1 || heading.getBoundingClientRect().bottom > limit)) violations.add(heading.dataset.field ?? "rubrik");
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
    if (title) {
      const intro = root.querySelector<HTMLElement>(".sheet-intro");
      const maxHeight = parseFloat(getComputedStyle(title).lineHeight) * Number(title.dataset.rows ?? 2);
      if (title.getBoundingClientRect().height / visualScale > maxHeight + 1 || (intro?.textContent?.trim() && title.getBoundingClientRect().bottom > intro.getBoundingClientRect().top - 3 * visualScale)) violations.add("profession");
    }
    if (title && (title.scrollWidth > title.clientWidth + 1 || title.getBoundingClientRect().bottom > heroLimit)) violations.add("profession");
  }
  const pageBottom = root.getBoundingClientRect().bottom;
  const footer = root.querySelector<HTMLElement>(".sheet-footer");
  if (footer && footer.getBoundingClientRect().bottom > pageBottom - 2 * visualScale) violations.add("contactOneEmail");
  const about = root.querySelector<HTMLElement>(".sheet-about");
  if (about && footer && about.getBoundingClientRect().bottom > footer.getBoundingClientRect().top - 5 * visualScale) violations.add("about");
  root.querySelectorAll<HTMLElement>(".sheet-contact, .sheet-address").forEach(item => {
    if (item.scrollWidth > item.clientWidth + 1 || item.getBoundingClientRect().bottom > pageBottom - 2 * visualScale) violations.add(item.dataset.field ?? "address");
  });
  return [...violations];
}
