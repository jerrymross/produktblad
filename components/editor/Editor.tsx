"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import { Sheet } from "@/components/sheet/Sheet";
import { exampleSheet, EYEBROW_OPTIONS, GRADIENT_STRENGTHS, isSheetData, TEMPLATE_VERSION, textFields, type SheetData } from "@/lib/sheet";
import { measureSheetOverflow } from "@/lib/overflow";
import { draftKey, EXAMPLE_STORAGE_KEY, initialSheet, readPreviousDraft, type CatalogEntry } from "@/lib/catalog";

const GROUPS = ["Omslag", "Innehåll", "Nederdel"] as const;
const GROUP_LABELS = { Omslag: "Omslag", Innehåll: "Utbildning", Nederdel: "Kontakt" };
const SECTIONS: { id: string; label: string; group: string; keys: (keyof SheetData)[] }[] = [
  { id: "why", label: "Om utbildningen", group: "Innehåll", keys: ["whyTitle", "why"] },
  { id: "learn", label: "Det här lär du dig", group: "Innehåll", keys: ["learnTitle", "learn"] },
  { id: "process", label: "Så här går det till", group: "Innehåll", keys: ["processTitle", "process"] },
  { id: "form", label: "Utbildningsform", group: "Innehåll", keys: ["formTitle", "form"] },
  { id: "audience", label: "Vem kan söka?", group: "Innehåll", keys: ["audienceTitle", "audience"] },
  { id: "finance", label: "Ekonomisk kompensation", group: "Innehåll", keys: ["financeTitle", "finance"] },
  { id: "school", label: "Om Astar & skolans adress", group: "Nederdel", keys: ["about", "address"] },
  { id: "contact-one", label: "Kontaktperson 1", group: "Nederdel", keys: ["contactOneName", "contactOneRole", "contactOneEmail"] },
  { id: "contact-two", label: "Kontaktperson 2", group: "Nederdel", keys: ["contactTwoName", "contactTwoRole", "contactTwoEmail"] },
  { id: "qr", label: "Webbadress & QR-kod", group: "Nederdel", keys: ["qrUrl"] },
];

function shortFieldName(key: string) {
  return textFields.find(field => field.key === key)?.label ?? key;
}

export function Editor({ entry }: { entry?: CatalogEntry }) {
  const storageKey = entry ? draftKey(entry.id) : EXAMPLE_STORAGE_KEY;
  const defaults = entry ? initialSheet(entry) : exampleSheet;
  const hasKomvuxDefaults = entry?.program === "Komvux";
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
  const [activeSection, setActiveSection] = useState<string | null>("why");
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mobilePane, setMobilePane] = useState("editor");
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isSheetData(parsed)) { queueMicrotask(() => { setData(parsed); setHasSaved(true); }); return; }
      }
      const previous = readPreviousDraft(entry);
      if (previous) queueMicrotask(() => { setData(previous); setDirty(true); setMessage("Ditt tidigare utkast har lästs in i den nya mallen. Spara utkast för att behålla det här; den äldre sparningen finns kvar."); });
    } catch { /* Corrupt local draft does not block the prototype. */ }
  }, [storageKey, entry]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      if (!node.isConnected) return;
      const style = getComputedStyle(node);
      const width = node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const height = node.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      if (width <= 0 || height <= 0) return;
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

  const save = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      localStorage.removeItem(`${storageKey}:reset`);
      setDirty(false);
      setHasSaved(true);
      setMessage("Utkastet är sparat i den här webbläsaren.");
      return true;
    } catch {
      setMessage("Det gick inte att spara lokalt. Kontrollera webbläsarens lagringsutrymme.");
      return false;
    }
  }, [data, storageKey]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!busy) save();
      }
    };
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("keydown", keyboard);
    if (dirty) window.addEventListener("beforeunload", leave);
    return () => { window.removeEventListener("keydown", keyboard); window.removeEventListener("beforeunload", leave); };
  }, [save, dirty, busy]);

  useEffect(() => {
    if (!focusKey) return;
    const frame = requestAnimationFrame(() => {
      const node = document.getElementById(focusKey);
      node?.focus({ preventScroll: true });
      node?.scrollIntoView({ block: "nearest" });
      setFocusKey(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusKey, activeGroup, activeSection]);

  function openField(key: string) {
    const actualKey = key === "title" ? "profession" : key === "image" ? "image-input" : key;
    const field = textFields.find(field => field.key === actualKey);
    setActiveGroup(field ? field.group as (typeof GROUPS)[number] : "Omslag");
    setActiveSection(SECTIONS.find(section => section.keys.includes(actualKey as keyof SheetData))?.id ?? null);
    setMobilePane("editor");
    setExpanded(false);
    setFocusKey(actualKey === "image-input" ? "change-image" : actualKey);
  }

  const validQr = /^https?:\/\//i.test(data.qrUrl);

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
    if (overflow.length || !validQr) {
      setMessage(overflow.length ? "Korta texten i de markerade fälten innan PDF kan skapas." : "Ange en QR-adress som börjar med https:// eller http://.");
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
      anchor.download = `produktblad-${entry ? `${entry.school}-${entry.title}` : "kock-exempel"}.pdf`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMessage("PDF är klar. Utkastet sparades lokalt före exporten.");
    } catch (error) {
      setMessage(error instanceof Error ? `PDF kunde inte skapas: ${error.message}` : "PDF kunde inte skapas.");
    } finally { setBusy(false); }
  }

  function reset() {
    if (!window.confirm(entry ? "Återställ till standardinnehållet? Sparningen i den aktuella mallen tas bort." : "Återställ till exempeltexten? Ditt lokala utkast ersätts.")) return;
    try {
      localStorage.setItem(`${storageKey}:reset`, "1");
      localStorage.removeItem(storageKey);
    } catch { setMessage("Det gick inte att återställa den lokala sparningen. Ditt innehåll finns kvar."); return; }
    setData(entry ? initialSheet(entry) : exampleSheet);
    setDirty(false);
    setHasSaved(false);
    setMessage(entry ? "Bladet är återställt till standardinnehållet. Ingen sparad version finns i den aktuella mallen." : "Exempeltexten är återställd.");
  }

  const visibleFields = textFields.filter(field => field.group === activeGroup).map(field => {
    if (entry && field.key === "why") return { ...field, label: `Text – ${defaults.whyTitle}` };
    if (entry && field.key === "whyTitle") return { ...field, label: `Rubrik – ${defaults.whyTitle}` };
    if (entry && field.key === "qrUrl") return { ...field, label: "QR-adress" };
    return field;
  });

  function renderField(field: (typeof textFields)[number]) {
    const colorKey = ({ titleLine: "titleLineColor", titlePrefix: "titlePrefixColor", profession: "professionColor" } as const)[field.key as "titleLine" | "titlePrefix" | "profession"];
    const tooLong = overflow.includes(field.key);
    const qrError = field.key === "qrUrl" && !validQr;
    const label = activeGroup === "Innehåll" ? field.key.endsWith("Title") ? "Rubrik" : "Text" : field.key === "qrUrl" ? "QR-adress" : field.label;
    return <div className={`field ${tooLong || qrError ? "field-error" : ""}`} key={field.key}>
      <div className="field-top"><label htmlFor={field.key}>{label}</label><div className="field-tools">{tooLong && <span className="overflow-label">Får inte plats</span>}{(field.group === "Innehåll" || field.key === "about") && <button type="button" className="reset-field" title={`Återställ standardtext: ${field.label}`} aria-label={`Återställ standardtext: ${field.label}`} disabled={data[field.key] === defaults[field.key]} onClick={() => { change(field.key, defaults[field.key]); setMessage("Fältets standardtext är återställd. Spara för att behålla ändringen."); }}>↺</button>}</div></div>
      {field.key === "eyebrow" ? <select id={field.key} value={data.eyebrow} onChange={event => change("eyebrow", event.target.value)}>{EYEBROW_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select> : field.multiline ? <textarea id={field.key} rows={field.key === "profession" ? 2 : field.key === "learn" || field.key === "why" ? 7 : 4} value={data[field.key]} aria-invalid={tooLong || undefined} onChange={event => change(field.key, event.target.value)} /> : <input id={field.key} value={data[field.key]} aria-invalid={tooLong || qrError || undefined} aria-describedby={field.key === "qrUrl" ? "qr-help" : undefined} onChange={event => change(field.key, event.target.value)} />}
      {colorKey && <div className="title-color"><label htmlFor={`${field.key}-color`}>Textfärg</label><select id={`${field.key}-color`} value={data[colorKey]} onChange={event => change(colorKey, event.target.value as SheetData[typeof colorKey])}><option value="auto">Automatisk (blå / vit på mörk bild)</option><option value="blue">Blå</option><option value="coral">Korall</option></select></div>}
      {field.key === "profession" && <small>Med tre rader bryts yrkesnamnet automatiskt. Enter ger en egen radbrytning. Färgen väljs separat för varje rubrikdel.</small>}
      {field.multiline && <span className="field-count">{data[field.key].length} tecken</span>}
      {field.key === "qrUrl" && <small id="qr-help">{validQr ? "QR-koden uppdateras direkt. Kontrollera att adressen leder till rätt utbildning." : "Ange skolans eller utbildningens webbadress med https://. Adressen behövs för PDF-export."}</small>}
    </div>;
  }

  return <div className={`workspace editor-workspace mobile-${mobilePane} ${expanded ? "preview-expanded" : ""}`}>
    <AppSidebar dirty={dirty} example={!entry} />
    <header className="app-header">
      <div className="header-center"><div className="breadcrumbs"><Link className="back-to-catalog" href="/produktblad" onClick={event => { if (dirty && !window.confirm("Lämna bladet med osparade ändringar? Spara utkast först om du vill behålla dem.")) event.preventDefault(); }}>Bibliotek</Link><span>/</span><span>{entry?.school ?? "Exempelblad"}</span><span>/</span><span>{entry?.program ?? "Komvux"}</span></div><h1 className="header-title">{entry?.title ?? "Kock"}</h1></div>
      <div className={`header-right save-state ${dirty ? "is-dirty" : hasSaved ? "is-saved" : ""}`}><span className="status-dot" />{dirty ? "Osparade ändringar" : hasSaved ? "Sparat lokalt" : "Inte sparat än"}</div>
          <div className="action-row"><button type="button" className="save-button" onClick={save} disabled={busy} title="Spara utkast (Ctrl+S eller ⌘S)">Spara utkast</button><button type="button" className="export-button" onClick={() => void exportPdf()} disabled={busy || overflow.length > 0 || !validQr}>{busy ? "Skapar PDF …" : "Ladda ner PDF ↓"}</button></div>
    </header>

    <nav className="mobile-pane-switch" aria-label="Arbetsyta"><button type="button" aria-pressed={mobilePane === "editor"} onClick={() => setMobilePane("editor")}>Redigera</button><button type="button" aria-pressed={mobilePane === "preview"} onClick={() => setMobilePane("preview")}>Förhandsvisa</button></nav>

    <div className="workspace-body">
      <aside className="editor-panel">
        <div className="panel-heading"><span className="eyebrow-ui">REDIGERA PRODUKTBLAD</span><h2>Innehåll</h2><p>Dina ändringar syns direkt på bladet.</p></div>
        <nav className="editor-tabs" aria-label="Redigeringsdelar">
          {GROUPS.map(group => <button key={group} type="button" aria-pressed={activeGroup === group} className={activeGroup === group ? "active" : ""} onClick={() => { setActiveGroup(group); setActiveSection(group === "Innehåll" ? "why" : "school"); }}>{GROUP_LABELS[group]}{overflow.some(key => textFields.find(field => field.key === key)?.group === group) && <span className="tab-error" aria-label="Text får inte plats">!</span>}</button>)}
        </nav>
        <div className="fields-scroll">
          <p className="section-help">{activeGroup === "Omslag" ? "Bild, rubrik och ingress är det första läsaren ser." : activeGroup === "Innehåll" ? "Öppna ett avsnitt i taget. Rubrik och text ändras var för sig." : "Fyll i rätt skoluppgifter och adressen till QR-koden."}</p>
          {activeGroup === "Omslag" && <><div className="field"><div className="field-top"><label htmlFor="titleRows">Rubrikens layout</label></div><select id="titleRows" value={data.titleRows} onChange={event => change("titleRows", event.target.value as SheetData["titleRows"])}><option value="2">Två rader – stor rubrik</option><option value="3">Upp till tre rader – långt yrkesnamn</option></select></div>{visibleFields.filter(field => ["profession", "titleLine", "titlePrefix"].includes(field.key)).map(renderField)}<div className="image-field"><div className="field-top"><label htmlFor="image-input">Omslagsbild</label><span>{data.image === "/reference-hero.jpg" ? "Exempelbild" : "Din bild"}</span></div><div className="image-picker"><div className="image-thumb" style={{ backgroundImage: `url("${data.image}")` }} /><div><strong>{data.image === "/reference-hero.jpg" ? "Välj en bild för utbildningen" : "Bild uppladdad"}</strong><p>JPG, PNG eller WebP · max 2 MB</p><button id="change-image" type="button" onClick={() => fileRef.current?.click()}>Byt bild →</button></div></div><input ref={fileRef} id="image-input" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => { void uploadImage(event.target.files?.[0]); event.target.value = ""; }} /></div>
            <fieldset className="gradient-control"><legend>Gradient över bilden</legend>
              <div className="gradient-colors" role="group" aria-label="Gradientfärg">{([["none", "Ingen"], ["white", "Vit"], ["navy", "Mörkblå"]] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={data.gradientStyle === value} onClick={() => change("gradientStyle", value)}><span className={`gradient-swatch swatch-${value}`} aria-hidden="true" />{label}</button>)}</div>
              <span className="gradient-label">Styrka</span><div className="gradient-levels" role="group" aria-label="Gradientens styrka">{GRADIENT_STRENGTHS.map((level, index) => <button type="button" key={level} disabled={data.gradientStyle === "none"} aria-pressed={data.gradientStrength === level} onClick={() => change("gradientStrength", level)}>{level}<small>{["Lätt", "Mjuk", "Tydlig", "Stark"][index]}</small></button>)}</div>
              <p>Tonas från vänster till höger. Mörkblå gradient ger vit rubrik och ingress.</p>
            </fieldset>{visibleFields.filter(field => !["profession", "titleLine", "titlePrefix"].includes(field.key)).map(renderField)}</>}
          {SECTIONS.filter(section => section.group === activeGroup).map(section => {
            const sectionError = section.keys.some(key => overflow.includes(key)) || (section.id === "qr" && !validQr);
            const bodyKey = section.keys.find(key => !key.endsWith("Title"));
            const titleKey = section.keys.find(key => key.endsWith("Title"));
            const label = titleKey ? data[titleKey] || section.label : section.label;
            return <section className={`editor-section ${activeSection === section.id ? "is-open" : ""} ${sectionError ? "has-error" : ""}`} key={section.id}>
              <button type="button" className="section-toggle" id={`toggle-${section.id}`} aria-expanded={activeSection === section.id} aria-controls={`section-${section.id}`} onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}><span><strong>{label}</strong><small>{sectionError ? "Behöver rättas" : bodyKey && data[bodyKey].trim() ? "Innehåll finns" : "Inte ifyllt"}</small></span><span aria-hidden="true">{activeSection === section.id ? "−" : "+"}</span></button>
              <div id={`section-${section.id}`} hidden={activeSection !== section.id} aria-labelledby={`toggle-${section.id}`}>{section.keys.map(key => visibleFields.find(field => field.key === key)).filter((field): field is (typeof textFields)[number] => Boolean(field)).map(renderField)}</div>
            </section>;
          })}
          <details className="editor-options"><summary>Om mallen & fler alternativ</summary><p>{entry ? `${hasKomvuxDefaults ? "Komvuxblad har förinställd text om upplägg, utbildningsform, målgrupp och ekonomi. Övriga innehållsfält är tomma." : "Nya blad har tomma texter."} Alla blad har en förinställd text om Astar längst ner. Exempelbilden behöver bytas till en bild för utbildningen.` : "Detta är exempeldata från referensen. Utbildnings- och kontaktuppgifter behöver faktagranskas."} Layouten är fast. Mallen är en lokal prototyp.</p><button type="button" className="text-button" onClick={reset}>{entry ? "Återställ standardinnehåll" : "Återställ exempeldata"}</button></details>
        </div>
        <div className="editor-actions">
          {(overflow.length > 0 || !validQr) && <div className="overflow-alert"><strong>{overflow.length ? "Text får inte plats på A4" : "QR-adress saknas eller är ogiltig"}</strong><button type="button" onClick={() => openField(overflow[0] ?? "qrUrl")}>Gå till {overflow.length ? shortFieldName(overflow[0]) : "QR-adress"} →{overflow.length > 1 ? ` (+${overflow.length - 1})` : ""}</button></div>}
          {message && <p className="message" role="status">{message}</p>}

          <p className="save-hint">Sparas i den här webbläsaren · Ctrl+S / ⌘S</p>
        </div>
      </aside>

      <main className="preview-panel">
        <div className="preview-toolbar"><div><h2>Förhandsvisning</h2><p><span className="preview-context">{entry ? `${entry.school} · ${entry.title}` : "Exempelblad · Kock"}</span><span className="preview-instruction">A4 · 210 × 297 mm</span></p></div><div className="preview-meta"><span className="meta-pill" title={TEMPLATE_VERSION}>Mall 01</span><button type="button" className="expand-preview" aria-label={expanded ? "Visa redigeraren" : "Förstora förhandsvisningen"} aria-pressed={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "↙" : "⤢"}</button></div></div>
        <div className="preview-zoom" role="group" aria-label="Zoom för förhandsvisningen">
          <button type="button" aria-label="Zooma ut" disabled={scale <= 0.05} onClick={() => setZoom(Math.max(0.05, scale - 0.1))}>−</button>
          <output className="zoom-value" aria-label="Zoomnivå">{Math.round(scale * 100)} %</output>
          <button type="button" aria-label="Zooma in" disabled={scale >= 2} onClick={() => setZoom(Math.min(2, scale + 0.1))}>+</button>
          <button type="button" className="zoom-actual" onClick={() => setZoom(1)}>100 %</button>
          <button type="button" className="zoom-fit" aria-pressed={zoom === null} onClick={() => { setZoom(null); stageRef.current?.scrollTo({ top: 0, left: 0 }); }}>Anpassa</button>
        </div>
        <div className="preview-canvas" ref={stageRef} tabIndex={0} aria-label="Förhandsvisning av produktblad. Zoomade blad kan scrollas här." onClick={event => {
          const target = event.target as HTMLElement;
          const field = target.closest<HTMLElement>("[data-field]");
          if (field?.dataset.field) openField(field.dataset.field);
          else if (target.closest(".sheet-hero-image")) openField("image");
        }}>
          <div className="preview-size" style={{ width: 794 * scale, height: 1123 * scale }}>
            <div className="preview-transform" style={{ transform: `scale(${scale})` }}><Sheet data={data} /></div>
          </div>
        </div>
        <div className="preview-footer"><span><span className="blue-dot" /> En sida · 210 × 297 mm</span><span>Layoutreferens: Kock.pdf</span></div>
      </main>
    </div>
  </div>;
}
