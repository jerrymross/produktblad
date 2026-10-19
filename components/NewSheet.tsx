"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { cloud, jsonRequest } from "@/lib/cloud-client";
import { newSheetPrograms } from "@/lib/added-sheets";

export function NewSheet() {
  const router = useRouter();
  const requestId = useRef("");
  const [schools, setSchools] = useState<string[]>([]);
  const [school, setSchool] = useState("");
  const [program, setProgram] = useState<string>("Komvux");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    requestId.current = crypto.randomUUID();
    cloud<{ schools: string[]; available: boolean }>("/api/sheets/new", { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setSchools(result.schools); setSchool(result.schools.length === 1 ? result.schools[0] : ""); setAvailable(result.available); } })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  async function create() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await cloud<{ id: string }>("/api/sheets/new", jsonRequest("POST", { requestId: requestId.current, school, program, title }));
      router.push(`/?blad=${encodeURIComponent(result.id)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Bladet kunde inte skapas."); setBusy(false); }
  }
  return <><AppSidebar dirty={!!title && !busy} /><main className="admin-page">
    <span className="eyebrow-ui">SKAPA I SKOLANS BIBLIOTEK</span><h1>Nytt produktblad</h1>
    <p>Välj utbildningsform och skola och ange utbildningens namn. Därefter öppnas bladet i redigeraren med rätt A4-mall.</p>
    <form className="admin-panel" onSubmit={event => { event.preventDefault(); void create(); }}>
      {loading && <p role="status">Hämtar dina skolor …</p>}
      {!loading && !available && !error && <p role="status">Nya produktblad har ännu inte aktiverats. Kontakta administratören.</p>}
      {!loading && available && !schools.length && <p role="status">Du behöver tilldelas en skola innan du kan skapa produktblad.</p>}
      <fieldset className="new-sheet-fields" disabled={loading || busy || !available || !schools.length}>
        <legend>Uppgifter för det nya bladet</legend>
        <label htmlFor="new-sheet-title">Utbildningens namn</label><input id="new-sheet-title" required maxLength={150} value={title} onChange={event => { setTitle(event.target.value); requestId.current = crypto.randomUUID(); }} placeholder="Till exempel Restaurangbiträde" />
        <label htmlFor="new-sheet-program">Utbildningsform</label><select id="new-sheet-program" value={program} onChange={event => { setProgram(event.target.value); requestId.current = crypto.randomUUID(); }}>{newSheetPrograms.map(value => <option key={value}>{value}</option>)}</select>
        <label htmlFor="new-sheet-school">Skola</label><select id="new-sheet-school" required value={school} onChange={event => { setSchool(event.target.value); requestId.current = crypto.randomUUID(); }}><option value="">Välj skola</option>{schools.map(value => <option key={value}>{value}</option>)}</select>
        <p>Bladet läggs i den valda skolans bibliotek och visas för admin under Tillagda produktblad. Innehållet sparar du med Spara utkast i redigeraren.</p>
        <button className="save-button" type="submit">{busy ? "Skapar …" : "Skapa och öppna produktblad"}</button>
      </fieldset>
      {error && <p role="alert" className="admin-error">{error}</p>}
    </form>
  </main></>;
}
