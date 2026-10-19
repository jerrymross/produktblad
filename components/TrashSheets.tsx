"use client";
import { useEffect, useState } from "react";
import { cloud, jsonRequest } from "@/lib/cloud-client";

type TrashSheet = { id: string; title: string; school: string; deletedAt: string; deletedBy: string | null; deletionId: string; copyCount: string };
export function TrashSheets() {
  const [data, setData] = useState<{ available: boolean; sheets: TrashSheet[] } | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    cloud<{ available: boolean; sheets: TrashSheet[] }>("/api/admin/trash", { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setData(result); setError(""); } })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [refresh]);
  async function restore(sheet: TrashSheet) {
    if (pending) return;
    setPending(sheet.id); setError(""); setMessage("");
    try {
      await cloud("/api/admin/trash", jsonRequest("POST", { id: sheet.id, deletionId: sheet.deletionId }));
      setData(current => current && { ...current, sheets: current.sheets.filter(row => row.id !== sheet.id) });
      setMessage(`”${sheet.title}” har återställts till ${sheet.school}.`);
      window.dispatchEvent(new Event("studio-sheets"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Återställningen misslyckades."); }
    finally { setPending(null); }
  }
  const filtered = data?.sheets.filter(sheet => `${sheet.title} ${sheet.school} ${sheet.deletedBy ?? ""}`.toLocaleLowerCase("sv").includes(query.trim().toLocaleLowerCase("sv"))) ?? [];
  return <section className="admin-panel">
    <div className="admin-refresh"><p>Borttagna blad behåller sitt innehåll, bilder och historik. När ett original återställs kommer dess kopior tillbaka, utom kopior som tagits bort separat.</p><button disabled={pending !== null} onClick={() => setRefresh(value => value + 1)}>Uppdatera</button></div>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {!data && !error && <p role="status">Hämtar skräpkorgen …</p>}
    {data && !data.available && <p>Skräpkorgen har ännu inte aktiverats i databasen.</p>}
    <div className="admin-filters"><label>Sök blad, skola eller användare<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    <div className="admin-table-scroll"><table><caption className="sr-only">Borttagna produktblad</caption><thead><tr><th>Produktblad</th><th>Skola</th><th>Borttaget</th><th>Borttaget av</th><th>Åtgärd</th></tr></thead><tbody>{filtered.map(sheet => <tr key={sheet.id}><td>{sheet.title}{sheet.id.startsWith("copy:") ? ` · Kopia ${sheet.id.split(":")[1]}` : Number(sheet.copyCount) > 0 ? ` · ${sheet.copyCount} kopior` : ""}</td><td>{sheet.school}</td><td>{new Date(sheet.deletedAt).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" })}</td><td>{sheet.deletedBy ?? "Borttagen användare"}</td><td><button className="text-button" disabled={pending !== null} onClick={() => void restore(sheet)}>{pending === sheet.id ? "Återställer …" : "Återställ"}</button></td></tr>)}</tbody></table></div>
    {data?.available && !filtered.length && <p>{data.sheets.length ? "Inga blad matchar sökningen." : "Skräpkorgen är tom."}</p>}
  </section>;
}
