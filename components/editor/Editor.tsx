"use client";
import { schoolVisitAddress, withVisitAddress } from "@/lib/school-addresses";
import { withUnsavedProgramDefaults } from "@/lib/default-content";
import { withDefaultImage } from "@/lib/education-images";
import { sheetApiPath } from "@/lib/sheet-id";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { ImagePicker } from "@/components/images/ImagePicker";
import { Sheet } from "@/components/sheet/Sheet";
import { exampleSheet, EYEBROW_OPTIONS, GRADIENT_STRENGTHS, isSheetData, templateVersion, isAfProgram, withProgramLayout, textFields, type SheetData } from "@/lib/sheet";
import { measureSheetOverflow } from "@/lib/overflow";
import { draftKey, EXAMPLE_STORAGE_KEY, initialSheet, readPreviousDraft, schoolQrUrl, type CatalogEntry } from "@/lib/catalog";
import { cloud,jsonRequest } from "@/lib/cloud-client";
import { unavailableFinalization, type Finalization, type FinalizationEvent } from "@/lib/finalization";
import {unavailableCopies,type CopyStatus} from "@/lib/copies";

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
  const router=useRouter();
  const displayTitle=`${entry?.title??"Kock"}${entry?.copyNumber?` · Kopia ${entry.copyNumber}`:""}`;
  const [copyStatus,setCopyStatus]=useState<CopyStatus>(unavailableCopies);
  const storageKey = entry ? draftKey(entry.id) : EXAMPLE_STORAGE_KEY;
  const defaults = entry ? initialSheet(entry) : exampleSheet;
  const hasKomvuxDefaults = entry?.program === "Komvux";
  const [storedData, setData] = useState<SheetData>(() => entry ? initialSheet(entry) : exampleSheet);
  const [finalization,setFinalization]=useState<Finalization>(unavailableFinalization);
  const school = entry?.school;
  const program = entry?.program;
  const af = isAfProgram(program);
  const sections = af ? [SECTIONS[0], SECTIONS[1], SECTIONS[2], SECTIONS[4],
    { id: "start", label: "Utbildningsstart", group: "Innehåll", keys: ["startTitle", "start"] as (keyof SheetData)[] },
    SECTIONS[5], { ...SECTIONS[3], label: "Utbildningsfakta" }, ...SECTIONS.slice(6)] : SECTIONS;
  const data = useMemo(() => {
    if(finalization.finalized)return storedData;
    const resolved = withProgramLayout(storedData, program, school);
    return school ? { ...resolved, qrUrl: schoolQrUrl(school) } : resolved;
  }, [storedData, school, program,finalization.finalized]);
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
  const sheetId=entry?.id??"example";
  const sheetUrl=sheetApiPath(sheetId);
  const [revision,setRevision]=useState(0);
  const [locked,setLocked]=useState(false);
  const [loading,setLoading]=useState(true);
  const token=useRef("");
  const saving=useRef(false);
  const edits=useRef(0);
  const [history,setHistory]=useState<{revision:number;createdAt:string;content:SheetData}[]>([]);
  const [admin,setAdmin]=useState(false);
  const [lockEvents,setLockEvents]=useState<FinalizationEvent[]>([]);
  const confirmation=useRef<HTMLDialogElement>(null);
  const finalizationRef=useRef(finalization);
  const ownsSession=useRef(false);
  const dirtyRef=useRef(false);
  const transitionPending=useRef(false);
  const applyFinalization=useCallback((state:Finalization)=>{
    if(state.stateVersion<finalizationRef.current.stateVersion)return;
    finalizationRef.current=state;
    setFinalization(state);
    if(state.finalized){ownsSession.current=false;setLocked(false);}
  },[setLocked]);
  useEffect(()=>{dirtyRef.current=dirty;},[dirty]);

  useEffect(() => {
    let live=true;token.current=crypto.randomUUID();const session=token.current;
    let loaded=false;
    const lock=async(renew=false)=>{await cloud(`${sheetUrl}/lock`,jsonRequest("POST",{token:session,renew}));if(live){ownsSession.current=true;setLocked(true);}else void fetch(`${sheetUrl}/lock`,{...jsonRequest("DELETE",{token:session}),keepalive:true});};
    const load=async()=>{try{
      const [sheet,profile]=await Promise.all([cloud<{content:SheetData;revision:number;finalization?:Finalization;copyStatus?:CopyStatus}>(sheetUrl),cloud<{admin:boolean}>("/api/me")]);
      if(!live)return;setData(sheet.content);setRevision(sheet.revision);setHasSaved(sheet.revision>0);
      setAdmin(profile.admin);applyFinalization(sheet.finalization??unavailableFinalization);
      setCopyStatus(sheet.copyStatus??unavailableCopies);
      if(!sheet.finalization?.finalized && isAfProgram(entry?.program) && sheet.content.layout !== "af") { setDirty(true); setMessage("Bladet visas med det nya AF-upplägget. Spara för att skapa en version med den nya mallen. Äldre versioner behåller sitt upplägg."); }
      if(sheet.revision===0){try{const stored=localStorage.getItem(storageKey);const parsed=stored?JSON.parse(stored):null;const previous=isSheetData(parsed)?parsed:readPreviousDraft(entry);if(previous){setData(entry ? withVisitAddress(withDefaultImage(withUnsavedProgramDefaults(previous, entry.program, 0), entry.title, 0, sheet.content.image), entry) : withDefaultImage(previous, "Kock", 0, sheet.content.image));setDirty(true);setMessage("Ditt lokala utkast har lästs in. Spara utkast för att lägga det i det gemensamma biblioteket.");}}catch{ /* Local drafts remain optional. */ }}
      loaded=true;
      if(!sheet.finalization?.finalized)await lock();
    }catch(error){if(live)setMessage(error instanceof Error?error.message:"Bladet kunde inte öppnas.");}finally{if(live)setLoading(false);}};
    void load();
    const refresh=async()=>{
      if(!live||!loaded||transitionPending.current)return;
      try{
        const sheet=await cloud<{content:SheetData;revision:number;finalization?:Finalization;copyStatus?:CopyStatus}>(sheetUrl);
        if(!live||transitionPending.current)return;
        if(sheet.finalization?.finalized && sheet.finalization.stateVersion>=finalizationRef.current.stateVersion && !dirtyRef.current){
          setData(sheet.content);setRevision(sheet.revision);setHasSaved(sheet.revision>0);
        }
        applyFinalization(sheet.finalization??unavailableFinalization);
        setCopyStatus(sheet.copyStatus??unavailableCopies);
        if(ownsSession.current&&!finalizationRef.current.finalized)await lock(true);
      }catch(error){if(live){ownsSession.current=false;setLocked(false);setMessage(error instanceof Error?error.message:"Status kunde inte uppdateras. Dina ändringar finns kvar här.");}}
    };
    const timer=window.setInterval(()=>void refresh(),30_000);
    window.addEventListener("focus",refresh);
    const release=()=>{void fetch(`${sheetUrl}/lock`,{...jsonRequest("DELETE",{token:session}),keepalive:true});};
    window.addEventListener("pagehide",release);
    return()=>{live=false;ownsSession.current=false;window.clearInterval(timer);window.removeEventListener("focus",refresh);window.removeEventListener("pagehide",release);release();};
  }, [storageKey, entry,sheetUrl,applyFinalization]);

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
    if(finalizationRef.current.finalized)return;
    edits.current++;
    setData(current => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage("");
  }

  const save = useCallback(async () => {
    if(finalizationRef.current.finalized||!locked||loading||saving.current||transitionPending.current){setMessage("Bladet måste vara öppnat för redigering innan du sparar.");return null;}
    saving.current=true;setBusy(true);const edit=edits.current;
    try {
      const saved=await cloud<{content:SheetData;revision:number}>(sheetUrl,jsonRequest("PUT",{content:data,revision,token:token.current}));
      setRevision(saved.revision);
      if(edits.current===edit){setData(saved.content);setDirty(false);}
      setHasSaved(true);
      setMessage(edits.current===edit?"Utkastet är sparat i det gemensamma biblioteket.":"Versionen sparades. Du har nya osparade ändringar.");
      window.dispatchEvent(new Event("studio-sheets"));
      return saved;
    } catch(error) {setMessage(error instanceof Error?error.message:"Bladet kunde inte sparas. Dina ändringar finns kvar här.");void cloud<{finalization?:Finalization}>(sheetUrl).then(sheet=>applyFinalization(sheet.finalization??unavailableFinalization)).catch(()=>{});return null;}
    finally{saving.current=false;setBusy(false);}
  }, [data,revision,sheetUrl,locked,loading,setMessage,setData,setDirty,applyFinalization]);

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
    setActiveSection(sections.find(section => section.keys.includes(actualKey as keyof SheetData))?.id ?? null);
    setMobilePane("editor");
    setExpanded(false);
    setFocusKey(actualKey === "image-input" ? "change-image" : actualKey);
  }

  const validQr = /^https?:\/\//i.test(data.qrUrl);

  async function uploadImage(file?: File) {
    if (!file) return;
    if (file.size > 2_000_000 || !file.size) {
      setMessage("Välj JPG, PNG eller WebP, högst 2 MB.");
      return;
    }
    setBusy(true); setMessage("Laddar upp bilden …");
    try {
      const form = new FormData(); form.set("file", file); form.set("sheetId", sheetId);
      const uploaded = await cloud<{dataUrl:string}>("/api/media", {method:"POST",body:form});
      change("image", uploaded.dataUrl);
      setMessage("Bilden är uppladdad. Spara utkast för att behålla bildvalet på bladet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bilden kunde inte laddas upp.");
    } finally { setBusy(false); }
  }
  async function exportPdf() {
    if (overflow.length || !validQr) {
      setMessage(overflow.length ? "Korta texten i de markerade fälten innan PDF kan skapas." : "Ange en QR-adress som börjar med https:// eller http://.");
      return;
    }
    const saved=finalizationRef.current.finalized ? {revision} : await save();if(!saved)return;
    setBusy(true);
    setMessage("PDF skapas …");
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({id:sheetId,revision:saved.revision}),
      });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `produktblad-${entry ? `${entry.school}-${entry.title}${entry.copyNumber?`-kopia-${entry.copyNumber}`:""}` : "kock-exempel"}.pdf`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-");
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMessage("PDF är klar och bygger på den sparade bladversionen.");
    } catch (error) {
      setMessage(error instanceof Error ? `PDF kunde inte skapas: ${error.message}` : "PDF kunde inte skapas.");
    } finally { setBusy(false); }
  }

  function reset() {
    if(finalizationRef.current.finalized)return;
    if (!window.confirm("Återställ till standardinnehållet? Spara sedan för att skapa en ny version; historiken finns kvar.")) return;
    edits.current++;
    setData(entry ? initialSheet(entry) : exampleSheet);
    setDirty(true);
    setMessage("Standardinnehållet är inläst. Spara för att behålla ändringen.");
  }

  async function setFinished(desired:boolean) {
    if(!admin||transitionPending.current||saving.current||busy||loading)return;
    if(desired && (dirty||!locked||revision<1)){setMessage("Spara ändringarna innan du låser det färdiga bladet.");return;}
    transitionPending.current=true;setBusy(true);
    try{
      const result=await cloud<{finalization:Finalization}>(`${sheetUrl}/finalization`,jsonRequest("POST",{
        finalized:desired,revision,stateVersion:finalizationRef.current.stateVersion,token:token.current,confirmed:!desired,
      }));
      applyFinalization(result.finalization);
      confirmation.current?.close();
      window.dispatchEvent(new Event("studio-sheets"));
      setMessage(desired?"Det färdiga bladet är låst. Det kan fortfarande visas och exporteras.":"Bladet är upplåst. Ändringar kan sparas igen.");
      if(!desired){
        try{await cloud(`${sheetUrl}/lock`,jsonRequest("POST",{token:token.current}));ownsSession.current=true;setLocked(true);}
        catch(error){setMessage(`Bladet är upplåst. ${error instanceof Error?error.message:"Redigering kunde inte öppnas."}`);}
      }
    }catch(error){
      setMessage(error instanceof Error?error.message:"Låsstatus kunde inte ändras.");
      confirmation.current?.close();
      try{const sheet=await cloud<{finalization?:Finalization}>(sheetUrl);applyFinalization(sheet.finalization??unavailableFinalization);}catch{/* Preserve content if the status cannot be read. */}
    }finally{transitionPending.current=false;setBusy(false);}
  }

  async function createCopy(){
    if(transitionPending.current||busy||loading||!finalizationRef.current.finalized||dirty)return;
    transitionPending.current=true;setBusy(true);
    try{
      const result=await cloud<{id:string}>(`${sheetUrl}/copies`,jsonRequest("POST",{revision}));
      window.dispatchEvent(new Event("studio-sheets"));
      router.push(`/?blad=${encodeURIComponent(result.id)}`);
      setMessage("Kopian är skapad och öppnas för redigering.");
    }catch(error){
      setMessage(error instanceof Error?error.message:"Kopian kunde inte skapas.");
    }finally{
      try{const sheet=await cloud<{copyStatus?:CopyStatus}>(sheetUrl);setCopyStatus(sheet.copyStatus??unavailableCopies);}catch{/* Keep the current contents on connection failures. */}
      transitionPending.current=false;setBusy(false);
    }
  }

  const visibleFields = textFields.filter(field => field.group === activeGroup && (!field.afOnly || af)).map(field => {
    if (entry && field.key === "why") return { ...field, label: `Text – ${defaults.whyTitle}` };
    if (entry && field.key === "whyTitle") return { ...field, label: `Rubrik – ${defaults.whyTitle}` };
    if (af && field.key === "form") return { ...field, label: "Utbildningsfakta" };
    if (af && field.key === "formTitle") return { ...field, label: "Rubrik – Utbildningsfakta" };
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
      {field.key === "eyebrow" ? <select id={field.key} value={data.eyebrow} onChange={event => change("eyebrow", event.target.value)}>{EYEBROW_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select> : field.multiline ? <textarea id={field.key} rows={field.key === "profession" ? 2 : field.key === "learn" || field.key === "why" ? 7 : 4} value={data[field.key] ?? ""} aria-invalid={tooLong || undefined} onChange={event => change(field.key, event.target.value)} /> : <input id={field.key} value={data[field.key] ?? ""} readOnly={field.key === "qrUrl" && !!entry} aria-invalid={tooLong || qrError || undefined} aria-describedby={field.key === "qrUrl" ? "qr-help" : undefined} onChange={event => change(field.key, event.target.value)} />}
      {colorKey && <div className="title-color"><label htmlFor={`${field.key}-color`}>Textfärg</label><select id={`${field.key}-color`} title="Automatisk: blå text, eller vit text med mörkblå gradient" value={data[colorKey]} onChange={event => change(colorKey, event.target.value as SheetData[typeof colorKey])}><option value="auto">Automatisk</option><option value="blue">Blå</option><option value="coral">Korall</option></select></div>}
      {field.key === "address" && entry && <small>{schoolVisitAddress(entry) ? `Standard för denna utbildning: ${schoolVisitAddress(entry)}. Du kan ändra adressen för bladet. Ett tomt fält använder standardadressen när du sparar.` : "Besöksadress för denna utbildning behöver bekräftas. Fyll i rätt utbildningsplats."}</small>}
      {af && field.key === "form" && <small>Skriv en uppgift per rad. Etiketterna Ort:, Studieform:, Omfattning:, Längd:, APL: och Mål: visas i fet stil.</small>}
      {field.key === "profession" && <small>Med tre rader bryts yrkesnamnet automatiskt. Enter ger en egen radbrytning. Färgen väljs separat för varje rubrikdel.</small>}
      {field.multiline && <span className="field-count">{(data[field.key] ?? "").length} tecken</span>}
      {field.key === "qrUrl" && <small id="qr-help">{entry ? `QR-koden genereras automatiskt för ${entry.school}. Adressen använder a och o i stället för å, ä och ö.` : validQr ? "QR-koden uppdateras direkt. Kontrollera att adressen leder till rätt utbildning." : "Ange skolans eller utbildningens webbadress med https://. Adressen behövs för PDF-export."}</small>}
    </div>;
  }

  return <div className={`workspace editor-workspace mobile-${mobilePane} ${expanded ? "preview-expanded" : ""}`}>
    <AppSidebar dirty={dirty} example={!entry} currentTitle={displayTitle} />
    <header className="app-header">
      <div className="header-center"><div className="breadcrumbs"><Link className="back-to-catalog" href="/produktblad" onClick={event => { if (dirty && !window.confirm("Lämna bladet med osparade ändringar? Spara utkast först om du vill behålla dem.")) event.preventDefault(); }}>Bibliotek</Link><span>/</span><span>{entry?.school ?? "Exempelblad"}</span><span>/</span><span>{entry?.program ?? "Komvux"}</span></div><h1 className="header-title">{displayTitle}</h1></div>
      <div className="header-status-actions">
        <div className={`header-right save-state ${dirty ? "is-dirty" : hasSaved ? "is-saved" : ""}`} title={finalization.finalized?`Låst av ${finalization.changedBy??"admin"}${finalization.changedAt?` · ${new Date(finalization.changedAt).toLocaleString("sv-SE")}`:""}`:undefined}><span className="status-dot" />{loading?"Öppnar …":finalization.finalized ? "Låst av admin" : dirty ? "Osparade ändringar" : hasSaved ? `Sparat · version ${revision}` : "Inte sparat än"}</div>
        {finalization.available && admin && <button type="button" className="finalization-button" disabled={busy||loading||(!finalization.finalized&&(dirty||!locked||revision<1))} title={finalization.finalized?"Öppna bekräftelsen för upplåsning":"Spara bladet och lås sedan det färdiga innehållet"} onClick={()=>finalization.finalized?confirmation.current?.showModal():void setFinished(true)}>{finalization.finalized?"Lås upp …":"Lås blad"}</button>}
        {entry && !entry.sourceId && copyStatus.available && <div className="sheet-copies header-copy-actions">
          {finalization.finalized && <button type="button" className="create-copy-button" title={copyStatus.copies.length>=2?"Två kopior finns redan. Öppna en befintlig kopia.":"Skapa en redigerbar kopia. Originalet förblir låst."} disabled={busy||loading||dirty||copyStatus.copies.length>=2} onClick={()=>void createCopy()}>Skapa kopia ({copyStatus.copies.length}/2)</button>}
          {copyStatus.copies.length>0 && <details className="header-copies-menu"><summary>Kopior ({copyStatus.copies.length}/2)</summary><div className="header-copies-dropdown">{copyStatus.copies.map(copy=><Link key={copy.id} href={`/?blad=${encodeURIComponent(copy.id)}`} onClick={event=>{if(dirty&&!window.confirm("Lämna bladet med osparade ändringar?"))event.preventDefault();}}>Öppna kopia {copy.copyNumber} →</Link>)}{copyStatus.copies.length>=2 && <p>Gränsen på två kopior är nådd.</p>}</div></details>}
        </div>}
      </div>
          <div className="action-row"><button type="button" className="save-button" onClick={()=>void save()} disabled={busy||loading||!locked||finalization.finalized} title="Spara utkast (Ctrl+S eller ⌘S)">{busy?"Arbetar …":"Spara utkast"}</button><button type="button" className="export-button" onClick={() => void exportPdf()} disabled={busy || loading || (!locked && !finalization.finalized) || (finalization.finalized && dirty) || overflow.length > 0 || !validQr}>Ladda ner PDF ↓</button></div>
    </header>

    <nav className="mobile-pane-switch" aria-label="Arbetsyta"><button type="button" aria-pressed={mobilePane === "editor"} onClick={() => setMobilePane("editor")}>Redigera</button><button type="button" aria-pressed={mobilePane === "preview"} onClick={() => setMobilePane("preview")}>Förhandsvisa</button></nav>

    <div className="workspace-body">
      <aside className="editor-panel">
        <div className="panel-heading"><span className="eyebrow-ui">REDIGERA PRODUKTBLAD</span><h2>Innehåll</h2><p>Dina ändringar syns direkt på bladet.</p></div>
        {entry?.sourceId && <div className="copy-origin"><strong>Kopia {entry.copyNumber} av 2</strong><p>Du ändrar en separat kopia. Originalbladet påverkas inte.</p><Link href={`/?blad=${encodeURIComponent(entry.sourceId)}`} onClick={event=>{if(dirty&&!window.confirm("Lämna kopian med osparade ändringar?"))event.preventDefault();}}>Visa originalbladet →</Link></div>}
        <nav className="editor-tabs" aria-label="Redigeringsdelar">
          {GROUPS.map(group => <button key={group} type="button" aria-pressed={activeGroup === group} className={activeGroup === group ? "active" : ""} onClick={() => { setActiveGroup(group); setActiveSection(group === "Innehåll" ? "why" : "school"); }}>{GROUP_LABELS[group]}{overflow.some(key => textFields.find(field => field.key === key)?.group === group) && <span className="tab-error" aria-label="Text får inte plats">!</span>}</button>)}
        </nav>
        <fieldset className="fields-scroll editor-fields" disabled={loading||!locked||finalization.finalized||busy}>
          <p className="section-help">{activeGroup === "Omslag" ? "Bild, rubrik och ingress är det första läsaren ser." : activeGroup === "Innehåll" ? "Öppna ett avsnitt i taget. Rubrik och text ändras var för sig." : "Fyll i rätt skoluppgifter och adressen till QR-koden."}</p>
          {activeGroup === "Omslag" && <><div className="field"><div className="field-top"><label htmlFor="titleRows">Rubrikens layout</label></div><select id="titleRows" value={data.titleRows} onChange={event => change("titleRows", event.target.value as SheetData["titleRows"])}><option value="2">Två rader – stor rubrik</option><option value="3">Upp till tre rader – långt yrkesnamn</option></select></div><div className="title-fields-pair">{visibleFields.filter(field => ["titleLine", "titlePrefix"].includes(field.key)).map(renderField)}</div>{visibleFields.filter(field => field.key === "profession").map(renderField)}<div className="image-field"><div className="field-top"><label htmlFor="image-input">Omslagsbild</label><span>{data.image === "/reference-hero.jpg" ? "Exempelbild" : "Din bild"}</span></div><div className="image-picker"><div className="image-thumb" style={{ backgroundImage: `url("${data.image}")` }} /><div><strong>{data.image === "/reference-hero.jpg" ? "Välj en bild för utbildningen" : "Bild vald"}</strong><p>JPG, PNG eller WebP · max 2 MB</p><button id="change-image" type="button" onClick={() => fileRef.current?.click()}>Ladda upp direkt →</button></div></div><input ref={fileRef} id="image-input" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => { void uploadImage(event.target.files?.[0]); event.target.value = ""; }} /></div>
            <ImagePicker title={entry?.title ?? "Kock"} onChoose={image => { change("image", image); setMessage("Bilden är vald. Spara utkast för att behålla den på bladet."); }} onManage={() => window.dispatchEvent(new Event("open-image-settings"))} />
            <fieldset className="gradient-control"><legend>Gradient över bilden</legend>
              <div className="gradient-colors" role="group" aria-label="Gradientfärg">{([["none", "Ingen"], ["white", "Vit"], ["navy", "Mörkblå"]] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={data.gradientStyle === value} onClick={() => change("gradientStyle", value)}><span className={`gradient-swatch swatch-${value}`} aria-hidden="true" />{label}</button>)}</div>
              <span className="gradient-label">Styrka</span><div className="gradient-levels" role="group" aria-label="Gradientens styrka">{GRADIENT_STRENGTHS.map((level, index) => <button type="button" key={level} disabled={data.gradientStyle === "none"} aria-pressed={data.gradientStrength === level} onClick={() => change("gradientStrength", level)}>{level}<small>{["Lätt", "Mjuk", "Tydlig", "Stark"][index]}</small></button>)}</div>
              <p>Tonas från vänster till höger. Mörkblå gradient ger vit rubrik och ingress.</p>
            </fieldset>{visibleFields.filter(field => !["profession", "titleLine", "titlePrefix"].includes(field.key)).map(renderField)}</>}
          {sections.filter(section => section.group === activeGroup).map(section => {
            const sectionError = section.keys.some(key => overflow.includes(key)) || (section.id === "qr" && !validQr);
            const bodyKey = section.keys.find(key => !key.endsWith("Title"));
            const titleKey = section.keys.find(key => key.endsWith("Title"));
            const label = titleKey ? data[titleKey] || section.label : section.label;
            return <section className={`editor-section ${activeSection === section.id ? "is-open" : ""} ${sectionError ? "has-error" : ""}`} key={section.id}>
              <button type="button" className="section-toggle" id={`toggle-${section.id}`} aria-expanded={activeSection === section.id} aria-controls={`section-${section.id}`} onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}><span><strong>{label}</strong><small>{sectionError ? "Behöver rättas" : bodyKey && (data[bodyKey] ?? "").trim() ? "Innehåll finns" : "Inte ifyllt"}</small></span><span aria-hidden="true">{activeSection === section.id ? "−" : "+"}</span></button>
              <div id={`section-${section.id}`} hidden={activeSection !== section.id} aria-labelledby={`toggle-${section.id}`}>{section.keys.map(key => visibleFields.find(field => field.key === key)).filter((field): field is (typeof textFields)[number] => Boolean(field)).map(renderField)}</div>
            </section>;
          })}
          <details className="editor-options"><summary>Om mallen & fler alternativ</summary><p>{entry ? `${hasKomvuxDefaults ? "Nya Komvuxblad har PDF-text med *** för yrkesspecifika uppgifter som ska fyllas i." : af ? "Nya AF-blad har PDF-text med **** för uppgifter som ska fyllas i." : "Nya blad har tomma texter."} Alla blad har en förinställd text om Astar längst ner. Exempelbilden behöver bytas till en bild för utbildningen.` : "Detta är exempeldata från referensen. Utbildnings- och kontaktuppgifter behöver faktagranskas."} Layouten är fast. Mallen är en lokal prototyp.</p><button type="button" className="text-button" onClick={reset}>{entry ? "Återställ standardinnehåll" : "Återställ exempeldata"}</button></details>
        </fieldset>
        <div className="editor-actions">
          {(overflow.length > 0 || !validQr) && <div className="overflow-alert"><strong>{overflow.length ? "Text får inte plats på A4" : "QR-adress saknas eller är ogiltig"}</strong><button type="button" onClick={() => openField(overflow[0] ?? "qrUrl")}>Gå till {overflow.length ? shortFieldName(overflow[0]) : "QR-adress"} →{overflow.length > 1 ? ` (+${overflow.length - 1})` : ""}</button></div>}
          {finalization.finalized && dirty && <p className="message" role="status">Bladet är låst. Dina osparade ändringar finns kvar här.</p>}
          {message && <p className="message" role="status">{message}</p>}

          {!locked&&!loading&&!finalization.finalized&&<button type="button" className="text-button" disabled={busy} onClick={()=>{void cloud(`${sheetUrl}/lock`,jsonRequest("POST",{token:token.current})).then(()=>{ownsSession.current=true;setLocked(true);setMessage("Du kan nu redigera bladet.");}).catch(error=>setMessage(error.message));}}>Försök öppna för redigering igen</button>}
          <details className="sheet-history"><summary onClick={()=>{void cloud<{versions:typeof history;events?:FinalizationEvent[]}>(`${sheetUrl}/history`).then(result=>{setHistory(result.versions);setLockEvents(result.events??[]);}).catch(error=>setMessage(error.message));}}>Versionshistorik</summary>{lockEvents.map((event,index)=><p className="finalization-event" key={`${event.createdAt}-${index}`}>{event.finalized?"Låst":"Upplåst"} av {event.changedBy} · {new Date(event.createdAt).toLocaleString("sv-SE")} · version {event.revision}</p>)}{history.map(version=><button type="button" className="text-button" key={version.revision} disabled={!locked||busy||finalization.finalized} onClick={()=>{if(dirty&&!window.confirm("Ersätt osparade ändringar med den här versionen?"))return;edits.current++;setData(entry ? withVisitAddress(version.content, entry) : version.content);setDirty(true);setMessage("Tidigare version är inläst. Spara för att skapa en ny version.");}}>Version {version.revision} · {new Date(version.createdAt).toLocaleString("sv-SE")}</button>)}</details>
          <p className="save-hint">Gemensamt bibliotek · Ctrl+S / ⌘S</p>
        </div>
      </aside>

      <main className="preview-panel">
        <div className="preview-toolbar"><div><h2>Förhandsvisning</h2><p><span className="preview-context">{entry ? `${entry.school} · ${entry.title}` : "Exempelblad · Kock"}</span><span className="preview-instruction">A4 · 210 × 297 mm</span></p></div><div className="preview-meta"><span className="meta-pill" title={templateVersion(data)}>{af ? "AF" : "KOMVUX"}</span><button type="button" className="expand-preview" aria-label={expanded ? "Visa redigeraren" : "Förstora förhandsvisningen"} aria-pressed={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "↙" : "⤢"}</button></div></div>
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
    <dialog ref={confirmation} className="settings-dialog finalization-dialog" aria-labelledby="unlock-title" onCancel={event=>{if(busy)event.preventDefault();}}>
      <h2 id="unlock-title">Lås upp produktbladet?</h2>
      <p>Bladet öppnas för redigering igen. Kollegor med åtkomst kan ändra innehållet. Upplåsningen sparas i historiken.</p>
      <div className="finalization-dialog-actions"><button type="button" className="dialog-close" autoFocus disabled={busy} onClick={()=>confirmation.current?.close()}>Avbryt</button><button type="button" className="save-button" disabled={busy} onClick={()=>void setFinished(false)}>{busy?"Låser upp …":"Bekräfta upplåsning"}</button></div>
    </dialog>
  </div>;
}
