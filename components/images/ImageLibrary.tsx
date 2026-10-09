"use client";
import { useState } from "react";
import { deleteLibraryImage, educationKey, educations, uploadLibraryImage } from "@/lib/image-library";
import { useImageLibrary } from "./useImageLibrary";

export function ImageLibrary({ currentTitle = "Kock" }: { currentTitle?: string }) {
  const { images, loading, error } = useImageLibrary();
  const [selected, setSelected] = useState(() => educationKey(currentTitle));
  const [query, setQuery] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const count = (id: string) => images.filter(image => image.education === id).length;
  const complete = educations.filter(item => count(item.id) === 2).length;
  const filtered = educations.filter(item => (!missingOnly || count(item.id) < 2) && item.title.toLocaleLowerCase("sv").includes(query.trim().toLocaleLowerCase("sv")));
  async function upload(slot: 1 | 2, file?: File) {
    if (!file) return;
    setBusy(true); setMessage("");
    try { await uploadLibraryImage(selected, slot, file); setMessage(`Bild ${slot} sparades i biblioteket.`); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Uppladdningen misslyckades."); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("Ta bort bilden från biblioteket? Bilder som redan valts på blad finns kvar på de bladen.")) return;
    setBusy(true);
    try { await deleteLibraryImage(id); setMessage("Bilden är borttagen från biblioteket."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Bilden kunde inte tas bort."); }
    finally { setBusy(false); }
  }
  return <section className="image-library" aria-label="Bildbibliotek">
    <p>Två bildvarianter per utbildning. Samma utbildningsnamn delar bilder mellan skolorna.</p>
    <p className="library-local-note">Bilderna sparas på den här datorn, i den här webbläsaren.</p>
    {loading ? <p role="status">Läser bildbiblioteket …</p> : error ? <p role="alert">{error}</p> : <>
      <div className="image-library-stats"><strong>{complete} av {educations.length} kompletta</strong><span>{educations.length * 2 - images.length} bilder saknas</span></div>
      <div className="field"><label htmlFor="manage-education">Utbildning att ladda upp till</label><select id="manage-education" disabled={busy} value={selected} onChange={event => { setSelected(event.target.value); setMessage(""); }}>{educations.map(item => <option key={item.id} value={item.id}>{item.title} · {count(item.id)}/2 bilder</option>)}</select></div>
      <div className="image-slots">{([1, 2] as const).map(slot => {
        const image = images.find(item => item.education === selected && item.slot === slot);
        return <article className="image-slot" key={`${selected}:${slot}`}><h3>Bild {slot} <span>{image ? "Finns" : "Saknas"}</span></h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image ? <img src={image.dataUrl} alt={`Bild ${slot} för ${selected}`} /> : <div className="image-slot-empty">Ingen bild uppladdad</div>}
          {image && <p className="image-filename" title={image.name}>{image.name}</p>}
          <label className={`image-upload-button ${busy ? "is-busy" : ""}`}>{image ? "Ersätt bild" : "Ladda upp bild"}<input aria-label={`${image ? "Ersätt" : "Ladda upp"} bild ${slot}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => { void upload(slot, event.target.files?.[0]); event.target.value = ""; }} /></label>
          {image && <button type="button" className="text-button" disabled={busy} onClick={() => void remove(image.id)}>Ta bort bild {slot}</button>}
        </article>;
      })}</div>
      <p className="library-help">JPG, PNG eller WebP · högst 2 MB per bild. Använd gärna liggande bilder med lugn yta till vänster för rubriken. Uppladdningar sparas direkt. Redan valda bilder på blad påverkas inte när en biblioteksbild ersätts.</p>
      <p role="status" className="library-feedback">{busy ? "Sparar …" : message}</p>
      <div className="image-overview-heading"><h3>Vad saknas?</h3><label><input type="checkbox" checked={missingOnly} onChange={event => setMissingOnly(event.target.checked)} /> Visa bara saknade</label></div>
      <input className="image-library-search" aria-label="Sök utbildning i bildöversikten" type="search" placeholder="Sök utbildning …" value={query} onChange={event => setQuery(event.target.value)} />
      <div className="image-overview">{filtered.map(item => <button type="button" key={item.id} disabled={busy} className={count(item.id) === 2 ? "images-complete" : "images-missing"} onClick={() => { setSelected(item.id); setMessage(""); document.getElementById("manage-education")?.focus(); }}><span>{item.title}</span><strong>{count(item.id)}/2</strong><small>{([1, 2] as const).filter(slot => !images.some(image => image.education === item.id && image.slot === slot)).map(slot => `Bild ${slot}`).join(" och ") || "Komplett"}</small></button>)}</div>
      {!filtered.length && <p>Inga utbildningar matchar ditt filter.</p>}
    </>}
  </section>;
}
