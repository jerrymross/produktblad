"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/sheet/Sheet";
import { exampleSheet, isSheetData, TEMPLATE_VERSION, textFields, type SheetData } from "@/lib/sheet";
import { measureSheetOverflow } from "@/lib/overflow";

const STORAGE_KEY = "produktbladsapp:kock:lokalt-utkast:v1";
const GROUPS = ["Omslag", "Innehåll", "Nederdel"] as const;

function shortFieldName(key: string) {
  return textFields.find(field => field.key === key)?.label ?? key;
}

export function Editor() {
  const [data, setData] = useState<SheetData>(exampleSheet);
  const [activeGroup, setActiveGroup] = useState<(typeof GROUPS)[number]>("Omslag");
  const [scale, setScale] = useState(0.82);
  const [overflow, setOverflow] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isSheetData(parsed)) queueMicrotask(() => setData(parsed));
      }
    } catch { /* Corrupt local draft does not block the prototype. */ }
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1, (node.clientWidth - 26) / 794)));
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setDirty(false);
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
    if (!window.confirm("Återställ till exempeltexten? Ditt lokala utkast ersätts.")) return;
    setData(exampleSheet);
    localStorage.removeItem(STORAGE_KEY);
    setDirty(false);
    setMessage("Exempeltexten är återställd.");
  }

  const visibleFields = textFields.filter(field => field.group === activeGroup);

  return <div className="workspace">
    <header className="app-header">
      <div className="brand"><span className="brand-symbol">✳</span><span>ASTAR <b>STUDIO</b></span></div>
      <div className="header-center"><span className="header-kicker">PRODUKTBLAD</span><span className="header-title">Kock <span>/</span> Mall 01</span></div>
      <div className="header-right"><span className="status-dot" /> Lokal prototyp <span className="header-divider" /> {dirty ? "Osparade ändringar" : "Sparat lokalt"}</div>
    </header>

    <div className="workspace-body">
      <aside className="editor-panel">
        <div className="panel-heading"><span className="eyebrow-ui">REDAKTÖR / STEG 1</span><h1>Forma ditt blad</h1><p>Ändra innehållet. Mallens typografi och placering är fasta.</p></div>
        <div className="prototype-note"><span>i</span><div><strong>Prototyp med exempeldata</strong><br />Utbildningsuppgifter och kontaktuppgifter är hämtade från referensen och behöver faktagranskas.</div></div>
        <nav className="editor-tabs" aria-label="Redigeringsdelar">
          {GROUPS.map((group, index) => <button key={group} type="button" className={activeGroup === group ? "active" : ""} onClick={() => setActiveGroup(group)}><span>0{index + 1}</span>{group}</button>)}
        </nav>
        <div className="fields-scroll">
          <div className="section-heading"><h2>{activeGroup}</h2><span>{visibleFields.length} fält</span></div>
          {activeGroup === "Omslag" && <div className="image-field"><div className="field-top"><label htmlFor="image-input">Huvudbild</label><span>FAST BILDYTA</span></div><div className="image-picker"><div className="image-thumb" style={{ backgroundImage: `url("${data.image}")` }} /><div><strong>Bild i övre delen</strong><p>JPG, PNG eller WebP. Bilden beskärs inom mallen.</p><button type="button" onClick={() => fileRef.current?.click()}>Byt bild</button></div></div><input ref={fileRef} id="image-input" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => void uploadImage(event.target.files?.[0])} /></div>}
          {visibleFields.map(field => <div className={`field ${overflow.includes(field.key) ? "field-error" : ""}`} key={field.key}>
            <div className="field-top"><label htmlFor={field.key}>{field.label}</label>{overflow.includes(field.key) && <span className="overflow-label">FÅR INTE PLATS</span>}</div>
            {field.multiline ? <textarea id={field.key} rows={field.key === "learn" || field.key === "why" ? 6 : 3} value={data[field.key]} onChange={event => change(field.key, event.target.value)} /> : <input id={field.key} value={data[field.key]} onChange={event => change(field.key, event.target.value)} />}
            {field.key === "qrUrl" && <small>Prototypens QR-kod pekar på en testadress.</small>}
          </div>)}
          <div className="editor-bottom-actions"><button type="button" className="text-button" onClick={reset}>Återställ exempeldata</button></div>
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
        <div className="preview-canvas" ref={stageRef}>
          <div className="preview-size" style={{ width: 794 * scale, height: 1123 * scale }}>
            <div className="preview-transform" style={{ transform: `scale(${scale})` }}><Sheet data={data} /></div>
          </div>
        </div>
        <div className="preview-footer"><span><span className="blue-dot" /> En sida · 210 × 297 mm</span><span>Layoutreferens: Kock.pdf</span></div>
      </main>
    </div>
  </div>;
}
