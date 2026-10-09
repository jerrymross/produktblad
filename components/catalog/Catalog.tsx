"use client";
import { sheetApiPath } from "@/lib/sheet-id";


import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import { useEffect, useState } from "react";
import { catalog,readDraft, readPreviousDraft, schools } from "@/lib/catalog";
import { TEMPLATE_VERSION } from "@/lib/sheet";
import { cloud,jsonRequest } from "@/lib/cloud-client";

const emptyFilters = { school: "", query: "", program: "", status: "all" };
const filterKey = "produktbladsapp:biblioteksfilter:v1";
const programs = [...new Set(catalog.map(entry => entry.program))];

export function Catalog({allowedSchools}:{allowedSchools:string[]|null}) {
  const visibleCatalog=catalog.filter(entry=>allowedSchools===null||allowedSchools.includes(entry.school));
  const visibleSchools=schools.filter(school=>allowedSchools===null||allowedSchools.includes(school));
  const [error,setError]=useState("");
  const [importing,setImporting]=useState(false);
  async function importLocal(){setImporting(true);setError("");let imported=0;let skipped=0;try{for(const entry of visibleCatalog){const content=readDraft(entry.id)??readPreviousDraft(entry);if(!content)continue;const url=sheetApiPath(entry.id);const current=await cloud<{revision:number}>(url);if(current.revision>0){skipped++;continue;}const token=crypto.randomUUID();await cloud(`${url}/lock`,jsonRequest("POST",{token}));try{await cloud(url,jsonRequest("PUT",{token,revision:0,content}));imported++;}finally{await cloud(`${url}/lock`,jsonRequest("DELETE",{token}));}}setError(`${imported} utkast importerades. ${skipped} befintliga gemensamma utkast behölls.`);window.dispatchEvent(new Event("studio-sheets"));}catch(error){setError(`${imported} utkast importerades. ${error instanceof Error?error.message:"Importen avbröts."} Dina lokala utkast finns kvar.`);}finally{setImporting(false);}}
  const [filters, setFilters] = useState(emptyFilters);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [previous, setPrevious] = useState<Set<string>>(new Set());
  useEffect(() => {
    const refresh = () => {
      void cloud<{sheets:{id:string}[]}>("/api/sheets").then(result=>{setSaved(new Set(result.sheets.filter(sheet=>catalog.some(entry=>entry.id===sheet.id)).map(sheet=>sheet.id)));}).catch(error=>setError(error instanceof Error?error.message:"Sparade blad kunde inte läsas."));
      setPrevious(new Set(catalog.filter(entry => readPreviousDraft(entry)).map(entry => entry.id)));
    };
    queueMicrotask(() => {
      refresh();
      try {
        const stored = JSON.parse(sessionStorage.getItem(filterKey) ?? "null");
        if (stored && Object.keys(emptyFilters).every(key => typeof stored[key] === "string")) {
          setFilters({ school: schools.includes(stored.school) ? stored.school : "", query: stored.query.slice(0, 200), program: programs.includes(stored.program) ? stored.program : "", status: ["all", "saved", "new", "previous"].includes(stored.status) ? stored.status : "all" });
        }
      } catch { /* Filters are optional; local storage may be unavailable. */ }
      setReady(true);
    });
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("studio-sheets",refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("pageshow", refresh);window.removeEventListener("studio-sheets",refresh); };
  }, []);
  useEffect(() => {
    if (ready) try { sessionStorage.setItem(filterKey, JSON.stringify(filters)); } catch { /* Optional session preference. */ }
  }, [filters, ready]);
  function filter(key: keyof typeof filters, value: string) { setFilters(current => ({ ...current, [key]: value })); }
  const search = filters.query.trim().toLocaleLowerCase("sv");
  const scoped = visibleCatalog.filter(entry => (!filters.school || entry.school === filters.school)
    && (!filters.program || entry.program === filters.program)
    && `${entry.school} ${entry.program} ${entry.title}`.toLocaleLowerCase("sv").includes(search));
  const counts = {
    all: scoped.length,
    saved: scoped.filter(entry => saved.has(entry.id)).length,
    new: scoped.filter(entry => !saved.has(entry.id) && !previous.has(entry.id)).length,
    previous: scoped.filter(entry => !saved.has(entry.id) && previous.has(entry.id)).length,
  };
  const filtered = scoped.filter(entry => filters.status === "all"
    || (filters.status === "saved" && saved.has(entry.id))
    || (filters.status === "new" && !saved.has(entry.id) && !previous.has(entry.id))
    || (filters.status === "previous" && !saved.has(entry.id) && previous.has(entry.id)));
  const hasFilters = filters.school || filters.query || filters.program || filters.status !== "all";

  return <div className="workspace catalog-workspace">
    <AppSidebar />
    <header className="app-header catalog-header"><div className="header-center"><span className="header-kicker">ASTAR · PRODUKTBLAD</span><span className="header-title">Bibliotek</span></div><span className="local-badge">Gemensamt bibliotek</span></header>
    <main className="catalog-main" id="main-content">
      <div className="catalog-intro">
        <div className="catalog-heading"><span className="eyebrow-ui">DITT BIBLIOTEK</span><h1>Rätt blad. Rätt skola.</h1><p>Hitta utbildningen, öppna bladet och gör det till ditt.</p></div>
        <div className="library-stats" aria-label="Bibliotekets översikt"><span><strong>{visibleSchools.length}</strong> skolor</span><span><strong>{visibleCatalog.length}</strong> produktblad</span><span><strong>{saved.size}</strong> sparade</span></div>
      </div>
      <button type="button" className="text-button" disabled={importing} onClick={()=>void importLocal()}>{importing?"Importerar …":"Importera mina tidigare lokala utkast"}</button>{error && <p role="status">{error}</p>}<section className="filter-panel" aria-label="Hitta produktblad">
        <div className="catalog-filters">
          <div className="search-filter"><label htmlFor="catalog-search">Sök produktblad</label><input id="catalog-search" type="search" placeholder="Till exempel kock eller Umeå" value={filters.query} onChange={event => filter("query", event.target.value)} /></div>
          <div><label htmlFor="school-filter">Skola</label><select id="school-filter" value={filters.school} onChange={event => filter("school", event.target.value)}><option value="">Alla skolor · alla produktblad</option>{visibleSchools.map(name => <option key={name} value={name}>{name}</option>)}</select></div>
          <div><label htmlFor="program-filter">Utbildningsform</label><select id="program-filter" value={filters.program} onChange={event => filter("program", event.target.value)}><option value="">Alla utbildningsformer</option>{programs.map(program => <option key={program}>{program}</option>)}</select></div>
        </div>
        <div className="filter-bottom"><div className="status-filters" role="group" aria-label="Filtrera efter sparning">{([
          ["all", "Alla"], ["saved", "Sparade"], ["new", "Ej påbörjade"], ["previous", "Tidigare mall"],
        ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filters.status === value} onClick={() => filter("status", value)}>{label}<span>{counts[value]}</span></button>)}</div><button type="button" className="clear-filters" disabled={!hasFilters} onClick={() => setFilters(emptyFilters)}>Rensa filter</button></div>
      </section>
      <div className="catalog-summary"><span role="status" aria-live="polite"><strong>{filtered.length}</strong> produktblad{filters.school ? ` · ${filters.school}` : " · Alla skolor"}</span><span className="saved-legend"><span className="status-dot" /> Grönt = ett sparat utkast i aktuell mall</span></div>
      <div className="catalog-grid">
        {filtered.map(entry => <article className={`catalog-card ${saved.has(entry.id) ? "card-saved" : ""}`} key={entry.id} data-school={entry.school}>
          <div className="catalog-card-top"><span className="catalog-program">{entry.program}</span><span className={`catalog-status ${saved.has(entry.id) ? "is-saved" : ""}`}><span aria-hidden="true" />{saved.has(entry.id) ? "Sparat utkast" : previous.has(entry.id) ? "Tidigare mall" : "Ej påbörjat"}</span></div>
          <p className="catalog-school">{entry.school}</p><h2>{entry.title}</h2>
          <div className="catalog-card-bottom"><span title={TEMPLATE_VERSION}>Mall 01 · A4</span><Link aria-label={`${saved.has(entry.id) || previous.has(entry.id) ? "Fortsätt redigera" : "Skapa produktblad"}: ${entry.title}, ${entry.school}, ${entry.program}`} href={`/?blad=${encodeURIComponent(entry.id)}`}>{saved.has(entry.id) || previous.has(entry.id) ? "Fortsätt redigera" : "Skapa produktblad"}<span aria-hidden="true"> →</span></Link></div>
        </article>)}
      </div>
      {!filtered.length && <div className="catalog-empty"><h2>Inga blad matchar ditt val</h2><p>{filters.status === "saved" ? "Här visas bara gemensamt sparade blad. Prova Alla för att skapa ett nytt blad." : "Prova ett annat sökord eller ta bort ett filter."}</p><button type="button" className="save-button" onClick={() => setFilters(emptyFilters)}>Visa alla produktblad</button></div>}
      <footer className="catalog-note"><p>Grönt visar sparning, inte godkännande eller faktagranskning. Nya Komvuxblad har förinställda standardtexter. Alla nya blad har en exempelbild. Utkasten sparas i skolans gemensamma bibliotek.</p><Link className="catalog-example" href="/?exempel=1">Se hur ett ifyllt exempelblad ser ut →</Link></footer>
    </main>
  </div>;
}
