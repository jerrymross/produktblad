"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { catalog, readDraft, readPreviousDraft, schools } from "@/lib/catalog";
import { TEMPLATE_VERSION } from "@/lib/sheet";

export function Catalog() {
  const [school, setSchool] = useState("");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [previous, setPrevious] = useState<Set<string>>(new Set());
  useEffect(() => {
    const refresh = () => {
      setSaved(new Set(catalog.filter(entry => readDraft(entry.id)).map(entry => entry.id)));
      setPrevious(new Set(catalog.filter(entry => readPreviousDraft(entry)).map(entry => entry.id)));
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("pageshow", refresh); };
  }, []);
  const search = query.trim().toLocaleLowerCase("sv");
  const filtered = catalog.filter(entry => (!school || entry.school === school)
    && `${entry.school} ${entry.program} ${entry.title}`.toLocaleLowerCase("sv").includes(search));
  return <div className="workspace">
    <header className="app-header catalog-header">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-logo" src="/logo_liggande.png" alt="Astar Education" width={784} height={219} />
      </div>
      <div className="header-center"><span className="header-kicker">PRODUKTBLAD</span><span className="header-title">Skolornas produktblad</span></div>
      <div className="header-right">Lokal prototyp</div>
    </header>
    <main className="catalog-main">
      <div className="catalog-heading"><span className="eyebrow-ui">BIBLIOTEK</span><h1>Välj ditt produktblad</h1><p>Välj skola eller visa alla produktblad. Grön markering betyder att ett blad finns sparat för den här mallen i din webbläsare.</p></div>
      <div className="catalog-filters">
        <div><label htmlFor="school-filter">Skola</label><select id="school-filter" value={school} onChange={event => setSchool(event.target.value)}><option value="">Alla produktblad</option>{schools.map(name => <option key={name} value={name}>{name}</option>)}</select></div>
        <div><label htmlFor="catalog-search">Sök utbildning</label><input id="catalog-search" type="search" placeholder="Utbildning, skola eller utbildningsform" value={query} onChange={event => setQuery(event.target.value)} /></div>
      </div>
      <div className="catalog-summary" role="status"><span>{filtered.length} produktblad · {school || "Alla skolor"}</span><span>Sparade blad: {filtered.filter(entry => saved.has(entry.id)).length} · Mall 01</span></div>
      <div className="catalog-grid">
        {filtered.map(entry => <article className="catalog-card" key={entry.id} data-school={entry.school}>
          <div className="catalog-card-top"><span className="catalog-program">{entry.program}</span><span className={`catalog-status ${saved.has(entry.id) ? "is-saved" : ""}`}><span aria-hidden="true" />{saved.has(entry.id) ? "Sparat produktblad" : previous.has(entry.id) ? "Sparat i tidigare mall" : "Inget sparat blad"}</span></div>
          <h2>{entry.title}</h2><p className="catalog-school">{entry.school}</p>
          <div className="catalog-card-bottom"><span title={TEMPLATE_VERSION}>Mall 01 · A4</span><Link href={`/?blad=${encodeURIComponent(entry.id)}`}>{saved.has(entry.id) || previous.has(entry.id) ? "Öppna blad" : "Skapa blad"}<span aria-hidden="true"> →</span></Link></div>
        </article>)}
      </div>
      {!filtered.length && <p className="catalog-empty">Inga produktblad matchar ditt val. Prova en annan sökning eller välj Alla produktblad.</p>}
      <p className="catalog-note">Utbildningslistan kommer från ditt underlag. Nya blad har tomma innehålls- och kontaktfält och en tillfällig exempelbild. Grön markering visar sparning, inte godkännande eller faktagranskning.</p>
      <Link className="catalog-example" href="/?exempel=1">Öppna Kock-mallens exempelblad</Link>
    </main>
  </div>;
}
