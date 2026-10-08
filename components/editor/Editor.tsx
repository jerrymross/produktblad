"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/sheet/Sheet";
import { exampleSheet, isSheetData, TEMPLATE_VERSION, textFields, type SheetData } from "@/lib/sheet";
import { measureSheetOverflow } from "@/lib/overflow";
import { draftKey, initialSheet, LEGACY_STORAGE_KEY, type CatalogEntry } from "@/lib/catalog";

const GROUPS = ["Omslag", "Innehåll", "Nederdel"] as const;

function shortFieldName(key: string) {
  return textFields.find(field => field.key === key)?.label ?? key;
}

export function Editor({ entry }: { entry?: CatalogEntry }) {
  const storageKey = entry ? draftKey(entry.id) : LEGACY_STORAGE_KEY;
  const [data, setData] = useState<SheetData>(() => entry ? initialSheet(entry) : exampleSheet);
  const [activeGroup, setActiveGroup] = useState<(typeof GROUPS)[number]>("Omslag");
  const [fitScale, setFitScale] = useState(0.5);
  const [zoom, setZoom] = useState<number | null>(null);
  const scale = zoom ?? fitScale;
  const [overflow, setOverflow] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isSheetData(parsed)) queueMicrotask(() => { setData(parsed); setHasSaved(true); });
      }
    } catch { /* Corrupt local draft does not block the prototype. */ }
  }, [storageKey]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      const style = getComputedStyle(node);
      const width = node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const height = node.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      setFitScale(Math.max(0.05, Math.min(1, width / 794, height / 1123)));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const measure = useCallback(() => setOverflow(measureSheetOverflow()), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      document.fonts.ready.then(() => requestAnimationFrame(measure));
    }, 50);
    return () => window.clearTimeout(timer);
  }, [data, scale, measure]);

  function change<K extends keyof SheetData>(key: K, value: SheetData[K]) {
    setData(current => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage("");
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      setDirty(false);
      setHasSaved(true);
      setMessage("Utkastet är sparat i den här webbläsaren.");
      return true;
    } catch {
      setMessage("Det gick inte att spara lokalt. Kontrollera webbläsarens lagringsutrymme.");
      return false;
    }
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 2_000_000) {
      setMessage("Välj JPG, PNG eller WebP under 2 MB för det lokala utkastet.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") change("image", reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function exportPdf() {
    if (overflow.length) {
      setMessage("Korta texten i de markerade fälten innan PDF kan skapas. Det här är en föreslagen regel som ännu ska bekräftas.");
      return;
    }
    if (!save()) return;
    setBusy(true);
    setMessage("PDF skapas …");
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "produktblad-kock-prototyp.pdf";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMessage("PDF är klar. Utkastet sparades lokalt före exporten.");
    } catch (error) {
      setMessage(error instanceof Error ? `PDF kunde inte skapas: ${error.message}` : "PDF kunde inte skapas.");
    } finally { setBusy(false); }
  }

  function reset() {
    if (!window.confirm(entry ? "Återställ till ett tomt blad? Ditt sparade lokala blad tas bort." : "Återställ till exempeltexten? Ditt lokala utkast ersätts.")) return;
    setData(entry ? initialSheet(entry) : exampleSheet);
    localStorage.removeItem(storageKey);
    setDirty(false);
    setHasSaved(false);
    setMessage(entry ? "Bladet är återställt. Ingen sparad version finns kvar." : "Exempeltexten är återställd.");
  }

  const visibleFields = textFields.filter(field => field.group === activeGroup).map(field => {
    if (entry && field.key === "why") return { ...field, label: "Om utbildningen" };
    if (entry && field.key === "qrUrl") return { ...field, label: "QR-adress" };
    return field;
  });

  return <div className="workspace editor-workspace">
    <header className="app-header">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-logo" src="/logo_liggande.png" alt="Astar Education" width={784} height={219} />
      </div>
      <div className="header-center"><span className="header-kicker">{entry?.school ?? "PRODUKTBLAD"}</span><span className="header-title">{entry?.title ?? "Kock"} <span>/</span> Mall 01</span></div>
      <div className="header-right"><span className="status-dot" /> Lokal prototyp <span className="header-divider" /> {dirty ? "Osparade ändringar" : hasSaved ? "Sparat lokalt" : "Inte sparat än"}</div>
    </header>

    <div className="workspace-body">
      <aside className="editor-panel">
        <div className="panel-heading"><Link className="back-to-catalog" href="/produktblad" onClick={event => { if (dirty && !window.confirm("Lämna bladet med osparade ändringar? Spara utkast först om du vill behålla dem.")) event.preventDefault(); }}>← Alla produktblad</Link><span className="eyebrow-ui">{entry ? `${entry.school} · ${entry.program}` : "REDAKTÖR / STEG 1"}</span><h1>Forma ditt blad</h1><p>Ändra innehållet. Mallens typografi och placering är fasta.</p></div>
        <div className="prototype-note"><span>i</span><div><strong>{entry ? "Fyll i utbildningens innehåll" : "Prototyp med exempeldata"}</strong><br />{entry ? "Kontrollera text, kontaktuppgifter och bild för den valda skolan. Bilden är tills vidare ett exempel." : "Utbildningsuppgifter och kontaktuppgifter är hämtade från referensen och behöver faktagranskas."}</div></div>
        <nav className="editor-tabs" aria-label="Redigeringsdelar">
          {GROUPS.map((group, index) => <button key={group} type="button" className={activeGroup === group ? "active" : ""} onClick={() => setActiveGroup(group)}><span>0{index + 1}</span>{group}</button>)}
        </nav>
        <div className="fields-scroll">
          <div className="section-heading"><h2>{activeGroup}</h2><span>{visibleFields.length} fält</span></div>
          {activeGroup === "Omslag" && <div className="image-field"><div className="field-top"><label htmlFor="image-input">Huvudbild</label><span>FAST BILDYTA</span></div><div className="image-picker"><div className="image-thumb" style={{ backgroundImage: `url("${data.image}")` }} /><div><strong>Bild i övre delen</strong><p>JPG, PNG eller WebP. Bilden beskärs inom mallen.</p><button type="button" onClick={() => fileRef.current?.click()}>Byt bild</button></div></div><input ref={fileRef} id="image-input" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => void uploadImage(event.target.files?.[0])} /></div>}
          {visibleFields.map(field => <div className={`field ${overflow.includes(field.key) ? "field-error" : ""}`} key={field.key}>
            <div className="field-top"><label htmlFor={field.key}>{field.label}</label>{overflow.includes(field.key) && <span className="overflow-label">FÅR INTE PLATS</span>}</div>
            {field.multiline ? <textarea id={field.key} rows={field.key === "learn" || field.key === "why" ? 6 : 3} value={data[field.key]} onChange={event => change(field.key, event.target.value)} /> : <input id={field.key} value={data[field.key]} onChange={event => change(field.key, event.target.value)} />}
            {field.key === "qrUrl" && <small>{entry ? "Ange rätt webbadress för skolan eller utbildningen, med https://." : "Prototypens QR-kod pekar på en testadress."}</small>}
          </div>)}
          <div className="editor-bottom-actions"><button type="button" className="text-button" onClick={reset}>{entry ? "Återställ till tomt blad" : "Återställ exempeldata"}</button></div>
        </div>
        <div className="editor-actions">
          {overflow.length > 0 && <div className="overflow-alert"><strong>Innehåll ryms inte på A4</strong><span>{overflow.map(shortFieldName).join(", ")}</span></div>}
          {message && <p className="message" role="status">{message}</p>}
          <div className="action-row"><button type="button" className="save-button" onClick={save}>Spara utkast</button><button type="button" className="export-button" onClick={() => void exportPdf()} disabled={busy || overflow.length > 0}>{busy ? "Skapar PDF …" : "Exportera PDF ↓"}</button></div>
          <p className="save-hint">Utkast sparas bara i den här webbläsaren. Exportspärr vid överfull text är ett förslag under prov.</p>
        </div>
      </aside>

      <main className="preview-panel">
        <div className="preview-toolbar"><div><span className="eyebrow-ui">FÖRHANDSVISNING</span><h2>Så ser bladet ut</h2></div><div className="preview-meta"><span className="meta-pill">A4 · Stående</span><span className="meta-pill">{TEMPLATE_VERSION}</span></div></div>
        <div className="preview-zoom" role="group" aria-label="Zoom för förhandsvisningen">
          <button type="button" aria-label="Zooma ut" disabled={scale <= 0.05} onClick={() => setZoom(Math.max(0.05, scale - 0.1))}>−</button>
          <output className="zoom-value" aria-label="Zoomnivå">{Math.round(scale * 100)} %</output>
          <button type="button" aria-label="Zooma in" disabled={scale >= 2} onClick={() => setZoom(Math.min(2, scale + 0.1))}>+</button>
          <button type="button" className="zoom-actual" onClick={() => setZoom(1)}>100 %</button>
          <button type="button" className="zoom-fit" aria-pressed={zoom === null} onClick={() => { setZoom(null); stageRef.current?.scrollTo({ top: 0, left: 0 }); }}>Visa hela bladet</button>
        </div>
        <div className="preview-canvas" ref={stageRef} tabIndex={0} aria-label="Förhandsvisning av produktblad. Zoomade blad kan scrollas här.">
          <div className="preview-size" style={{ width: 794 * scale, height: 1123 * scale }}>
            <div className="preview-transform" style={{ transform: `scale(${scale})` }}><Sheet data={data} /></div>
          </div>
        </div>
        <div className="preview-footer"><span><span className="blue-dot" /> En sida · 210 × 297 mm</span><span>Layoutreferens: Kock.pdf</span></div>
      </main>
    </div>
  </div>;
}
