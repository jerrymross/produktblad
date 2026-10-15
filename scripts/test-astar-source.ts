import assert from "node:assert/strict";
import { astarUrl, extractAstarText, fetchAstarSource } from "../lib/astar-source";

async function main() {
  for (const url of ["http://astar.se/x", "https://astar.se.evil.test", "https://localhost", "https://127.0.0.1", "https://astar.se:444/x", "https://user:pass@astar.se", "file:///x"])
    assert.throws(() => astarUrl(url));
  assert.equal(astarUrl("https://www.astar.se/utbildning#x").href, "https://www.astar.se/utbildning");
  const content = "Här lär du dig matlagning och hygien. Utbildningen innehåller praktiska moment i köket. ";
  const parsed = extractAstarText(`<header>MENY</header><main><h1>Kock</h1><script>INSTRUKTION</script><p>${content}&amp; service.</p></main><footer>KONTAKT</footer>`);
  assert.match(parsed.text, /& service/);
  assert.doesNotMatch(parsed.text, /MENY|INSTRUKTION|KONTAKT/);
  assert.equal(extractAstarText(`<main>${content.repeat(100)}</main>`).truncated, true);
  assert.throws(() => extractAstarText("<p>Tom</p>"));
  let calls = 0;
  await assert.rejects(fetchAstarSource("https://astar.se/x", async () => {
    calls++; return new Response(null, { status: 302, headers: { location: "https://127.0.0.1/private" } });
  }), /Endast/);
  assert.equal(calls, 1, "External redirect must be rejected before a second request");
  await assert.rejects(fetchAstarSource("https://astar.se/x", async () => new Response("x", {headers:{"content-type":"application/pdf"}})), /Kunde inte/);
  await assert.rejects(fetchAstarSource("https://astar.se/x", async () => new Response("x".repeat(1_000_001), {headers:{"content-type":"text/html"}})), /för stor/);
  const source = await fetchAstarSource("https://astar.se/x", async (_url, options) => {
    assert.equal(options?.redirect, "manual");
    assert.deepEqual(options?.headers, { Accept: "text/html" });
    return new Response(`<main>${content}</main>`, {headers:{"content-type":"text/html"}});
  });
  assert.equal(source.url, "https://astar.se/x");
  if (process.argv.includes("--live")) {
    const live = await fetchAstarSource("https://astar.se/utbildningar/kock-norrkoping-2");
    console.log(JSON.stringify({ title: live.title, characters: live.text.length, truncated: live.truncated, url: live.url }));
  }
  console.log("OK: URL-regler, omdirigering, HTML-extraktion, storleksgräns och felhantering.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
