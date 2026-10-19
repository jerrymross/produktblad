"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud-client";
import type { AddedSheet } from "@/lib/added-sheets";

const date = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Stockholm" });
export function AddedSheets() {
  const [data, setData] = useState<{ sheets: AddedSheet[]; available: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [school, setSchool] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    cloud<{ sheets: AddedSheet[]; available: boolean }>("/api/admin/added-sheets", { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  const filtered = data?.sheets.filter(item => (!school || item.school === school) &&
    [item.title, item.program, item.school, item.creatorName].join(" ").toLocaleLowerCase("sv").includes(query.trim().toLocaleLowerCase("sv"))) ?? [];
  return <section className="admin-panel">
    <div className="admin-refresh"><p>Blad skapade via Nytt produktblad, med de senaste först. Även blad där innehållet ännu inte sparats visas.</p><button disabled={loading} onClick={() => { setLoading(true); setError(""); setRefresh(value => value + 1); }}>Uppdatera</button></div>
    {loading && <p role="status">Hämtar tillagda produktblad …</p>}{error && <p role="alert">{error}</p>}
    {data && !data.available && <p>Nya produktblad har ännu inte aktiverats i databasen.</p>}
    <div className="admin-filters"><label>Sök produktblad eller skapare<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label><label>Skola<select value={school} onChange={event => setSchool(event.target.value)}><option value="">Alla skolor</option>{[...new Set(data?.sheets.map(item => item.school))].sort().map(value => <option key={value}>{value}</option>)}</select></label></div>
    <div className="admin-table-scroll"><table><caption className="sr-only">Tillagda produktblad</caption><thead><tr><th>Skapat</th><th>Produktblad</th><th>Utbildningsform</th><th>Skola</th><th>Skapat av</th><th>Status</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><time dateTime={item.createdAt}>{date.format(new Date(item.createdAt))}</time></td><td><Link href={`/?blad=${encodeURIComponent(item.id)}`}>{item.title}</Link></td><td>{item.program}</td><td>{item.school}</td><td>{item.creatorName ?? "Borttagen användare"}</td><td>{item.revision > 0 ? "Sparat utkast" : "Innehåll ej sparat"}</td></tr>)}</tbody></table></div>
    {!loading && data?.available && !filtered.length && <p>{data.sheets.length ? "Inga produktblad matchar sökningen." : "Inga nya produktblad har lagts till ännu."}</p>}
  </section>;
}
