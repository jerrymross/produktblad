import { astarUrl, fetchAstarHtml, fetchAstarSource } from "./astar-source";

export type EducationQuery = { title: string; school: string; program: string };
export type EducationCandidate = { url: string; title: string; schools: string[]; programs: string[]; exact: boolean; reason: string };
type PublicCourse = { title: string; path: string; schools: string[]; programs: string[] };
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const schoolName = (s: string) => normalize(s).replace(/^astar /, "");
const names = (value: unknown): string[] => Array.isArray(value) ? value.flatMap(item => item && typeof item.name === "string" ? [item.name.trim()] : []) : [];

// Parse only JSON data published in Astar's course directory; never execute scripts.
export function parseEducationDirectory(html: string): PublicCourse[] {
  const match = /resources:\s*(\[[^\n]+\]),/.exec(html);
  if (!match) throw new Error("Astars utbildningslista kunde inte läsas. Ange en länk manuellt.");
  const rows: unknown = JSON.parse(match[1]);
  if (!Array.isArray(rows) || rows.length > 2000) throw new Error("Utbildningslistan har ett oväntat format.");
  const courses: PublicCourse[] = [];
  for (const row of rows) {
    const detail = row?.resource_detail;
    if (!detail || typeof row.title !== "string" || typeof detail.hs_path !== "string" || !/^[a-z0-9-]+$/.test(detail.hs_path)) continue;
    if (detail.active?.name && detail.active.name !== "ja") continue;
    courses.push({ title: row.title.slice(0, 250), path: detail.hs_path, schools: names(detail.school), programs: names(detail.course_type) });
  }
  if (!courses.length) throw new Error("Inga utbildningssidor hittades. Ange en länk manuellt.");
  return courses;
}

export function matchEducations(courses: PublicCourse[], query: EducationQuery): EducationCandidate[] {
  const target = normalize(query.title).replace(/\s+af(?: rub)?$/, "");
  const place = schoolName(query.school);
  const program = query.program === "AF" ? "Arbetsmarknadsutbildning" : query.program === "AF RUB" ? "Rekryteringsutbildning" : query.program;
  const tokens = target.split(" ").filter(t => !["och", "i", "med", "till"].includes(t));
  if (!tokens.length || !place) return [];
  const matches = courses.map(course => {
    let title = normalize(course.title).replace(/^utbilda dig till /, "");
    for (const school of course.schools) {
      const suffix = schoolName(school);
      for (const prep of [" i ", " pa "]) if (title.endsWith(prep + suffix)) title = title.slice(0, -(prep + suffix).length);
    }
    const titleMatch = title === target;
    const schoolMatch = course.schools.some(s => schoolName(s) === place);
    const programMatch = course.programs.length === 1 && course.programs[0] === program;
    const overlap = tokens.filter(t => title.split(" ").includes(t)).length / tokens.length;
    // These variants may share the same visible title. Never choose one silently.
    const variantMismatch = ["pabyggnad", "sprakkombination", "larling", "distans"].some(v => normalize(course.path).includes(v) !== target.includes(v));
    const exact = titleMatch && schoolMatch && programMatch && !variantMismatch;
    const reason = exact ? "Utbildning, skola och utbildningstyp matchar." : [!titleMatch || variantMismatch ? "Kontrollera utbildningens namn/inriktning." : "", !schoolMatch ? "Annan eller okänd skola." : "", !programMatch ? "Annan eller okänd utbildningstyp." : ""].filter(Boolean).join(" ");
    return { url: astarUrl(`https://astar.se/utbildningar/${course.path}`).href, title: course.title, schools: course.schools, programs: course.programs, exact, reason, score: (exact ? 100 : 0) + overlap * 20 + (schoolMatch ? 20 : 0) + (programMatch ? 10 : 0), overlap };
  }).filter(c => c.overlap >= 0.5).sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
  return [...new Map(matches.map(c => [c.url, { url:c.url, title:c.title, schools:c.schools, programs:c.programs, exact:c.exact, reason:c.reason }])).values()].slice(0, 8);
}

let cached: { courses: PublicCourse[]; expires: number } | undefined;
export async function discoverEducation(query: EducationQuery, fetcher: typeof fetch = fetch) {
  let courses: PublicCourse[];
  if (fetcher === fetch && cached && cached.expires > Date.now()) courses = cached.courses;
  else {
    const page = await fetchAstarHtml("https://astar.se/utbildning", fetcher, 3_000_000);
    courses = parseEducationDirectory(page.html);
    if (fetcher === fetch) cached = { courses, expires: Date.now() + 15 * 60_000 };
  }
  const candidates = matchEducations(courses, query);
  const exact = candidates.filter(c => c.exact);
  let source = exact.length === 1 ? await fetchAstarSource(exact[0].url, fetcher) : null;
  if (source && normalize(source.title) !== normalize(exact[0].title)) {
    source = null;
    const candidate = candidates.find(c => c.url === exact[0].url)!;
    candidate.exact = false;
    candidate.reason = "Sidans rubrik avviker från utbildningslistan. Kontrollera källan innan du väljer den.";
  }
  return { query, candidates, source, message: source ? "En tydlig matchning hittades. Underlaget är hämtat från astar.se." : candidates.length ? "Välj rätt utbildningssida. Kontrollera skola och utbildningstyp." : "Ingen relevant utbildningssida hittades. Ange en länk eller fakta manuellt." };
}
