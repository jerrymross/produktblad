import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { catalog, initialSheet } from "../lib/catalog";
import { schoolVisitAddress, withVisitAddress } from "../lib/school-addresses";
import { sheetApiPath } from "../lib/sheet-id";

async function main() {
  const entry = (school: string, title: string) => {
    const found = catalog.find(row => row.school === school && row.title === title);
    assert.ok(found, `${school}: ${title}`); return found;
  };
  const cases = [
    ["Eskilstuna", "Kock", "Drottninggatan 12"],
    ["Eskilstuna", "Lokalvård AF", "Mått Johanssons väg 34"],
    ["Jönköping", "Administratör Bas", "Kompanigatan 8"],
    ["Jönköping", "Kock", "Kaserngatan 14"],
    ["Norrköping", "Installationselektriker", "Södra Promenaden 60"],
    ["Norrköping", "Kock", "Sprängstensgatan 1 A"],
    ["Nässjö", "Bagare och konditor", "Kaserngatan 14"],
    ["Skellefteå", "Fastighetsskötare", "Plåtvägen 9 A"],
    ["Skellefteå", "Florist", "Risbergsgatan 4"],
    ["Sundsvall", "Servering AF", "Skolhusallén 17 A"],
    ["Sundsvall", "Träarbetare", "Björneborgsgatan 41"],
    ["Sundsvall", "Kock", "Köpmangatan 29"],
  ];
  for (const [school, title, street] of cases) assert.ok(schoolVisitAddress(entry(school, title)).startsWith(street));
  for (const row of catalog) {
    assert.equal(initialSheet(row).address, schoolVisitAddress(row));
    assert.equal(withVisitAddress({ ...initialSheet(row), address: "Min egen adress" }, row).address, "Min egen adress");
  }
  for (const [school, title] of [["Astar Nationellt", "Livsmedel"], ["Växjö", "VVS Isolatör"], ["Nässjö", "Kock"], ["Norrköping", "Lokalvård AF"], ["Sundsvall", "Vårdbiträde AF"]]) assert.equal(schoolVisitAddress(entry(school, title)), "");

  const origin = process.env.TEST_ORIGIN ?? "http://localhost:3000";
  let cookie = "";
  const request = async (path: string, method = "GET", body?: unknown) => {
    const response = await fetch(origin + path, { method, headers: { origin, cookie, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const cookies = response.headers.getSetCookie(); if (cookies.length) cookie = cookies.map(value => value.split(";")[0]).join("; ");
    return response;
  };
  assert.equal((await request("/api/auth/sign-in/email", "POST", { email: process.env.TEST_EMAIL ?? "studio-test@example.org", password: readFileSync(".test-password", "utf8").trim() })).status, 200);
  const row = entry("Norrköping", "Kock i språkkombination"); const url = sheetApiPath(row.id);
  const response = await request(url); assert.equal(response.status, 200); const current = await response.json();
  assert.ok(current.content.address.trim(), "Current school sheet must have an address");
  if (origin === "http://localhost:3000") {
    const token = randomUUID(); assert.equal((await request(url + "/lock", "POST", { token })).status, 200);
    try {
      const save = async (revision: number, address: string) => {
        const result = await request(url, "PUT", { token, revision, content: { ...current.content, profession: "Kock", address } });
        assert.equal(result.status, 200, await result.clone().text()); return result.json();
      };
      const manual = await save(current.revision, "Manuellt vald utbildningsplats");
      assert.equal((await (await request(url)).json()).content.address, "Manuellt vald utbildningsplats");
      const saved = await save(manual.revision, " "); assert.equal(saved.content.address, schoolVisitAddress(row));
      const history = await (await request(url + "/history")).json();
      assert.equal(history.versions.find((version: { revision: number }) => version.revision === manual.revision).content.address, "Manuellt vald utbildningsplats");
      const pdf = await request("/api/pdf", "POST", { id: row.id, revision: saved.revision });
      assert.equal(pdf.status, 200, pdf.status === 200 ? "" : await pdf.text());
      writeFileSync("../../work/address-test.pdf", Buffer.from(await pdf.arrayBuffer()));
    } finally { await request(url + "/lock", "DELETE", { token }); }
  }
  await request("/api/auth/sign-out", "POST", {});
  console.log(`PASS: education address mappings, unknown addresses, preserved overrides and authenticated ${origin === "http://localhost:3000" ? "save/history/PDF" : "live read"}.`);
}
main().catch(error => { console.error(error.stack); process.exit(1); });
