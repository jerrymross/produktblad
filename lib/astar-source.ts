import { load } from "cheerio";

export function astarUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Ange en fullständig https-länk till utbildningen på astar.se."); }
  if (value.length > 2000 || url.protocol !== "https:" || !["astar.se", "www.astar.se"].includes(url.hostname) || url.port || url.username || url.password)
    throw new Error("Endast https-länkar till astar.se och www.astar.se är tillåtna.");
  url.hash = "";
  return url;
}

export function extractAstarText(html: string) {
  const $ = load(html);
  const title = $("h1").first().text().trim() || $("title").text().trim();
  $("h2,h3").each((_, element) => {
    if (/^relaterade utbildningar$/i.test($(element).text().trim())) $(element).closest(".dnd-section").remove();
  });
  $("script,style,noscript,iframe,nav,header,footer,form,button,svg,[hidden],[aria-hidden='true']").remove();
  const root = $("main").first().length ? $("main").first() : $("body");
  root.find("p,h1,h2,h3,h4,li,br,div,section,tr").each((_, element) => { $(element).append("\n"); });
  const text = root.text().split(/\n/).map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
  if (text.length < 80) throw new Error("Sidan innehåller för lite läsbar text. Välj utbildningens informationssida eller ange fakta manuellt.");
  return { title: title.slice(0, 250), text: text.slice(0, 6000), truncated: text.length > 6000 };
}

// Never forward portal credentials or cookies. Validate every redirect before fetching it.
export async function fetchAstarHtml(value: string, fetcher: typeof fetch = fetch, maxBytes = 1_000_000) {
  let url = astarUrl(value);
  const signal = AbortSignal.timeout(10000);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const response = await fetcher(url, { redirect: "manual", cache: "no-store", signal, headers: { Accept: "text/html" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Sidan saknar en giltig vidarebefordran.");
      url = astarUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("text/html") || !response.body) {
      await response.body?.cancel();
      throw new Error("Kunde inte läsa utbildningssidan. Kontrollera länken och försök igen.");
    }
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let html = "", bytes = 0;
    try {
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        bytes += chunk.byteLength;
        if (bytes > maxBytes) throw new Error("Sidan är för stor. Välj en mer avgränsad utbildningssida.");
        html += decoder.decode(chunk, { stream: true });
      }
      html += decoder.decode();
    } finally { await reader.cancel(); }
    return { html, url: url.href, fetchedAt: new Date().toISOString() };
  }
  throw new Error("Sidan vidarebefordrar för många gånger. Ange sidans slutliga adress.");
}

export async function fetchAstarSource(value: string, fetcher: typeof fetch = fetch) {
  const { html, ...meta } = await fetchAstarHtml(value, fetcher);
  return { ...extractAstarText(html), ...meta };
}
