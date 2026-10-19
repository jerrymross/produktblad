"use client";
import { appPath } from "@/lib/app-path";

import { useState } from "react";
import { educationKey, educations, snapshotLibraryImage } from "@/lib/image-library";
import { useImageLibrary } from "./useImageLibrary";

export function ImagePicker({ title, onChoose, onManage }: { title: string; onChoose: (image: string) => void; onManage: () => void }) {
  const { images, loading, error } = useImageLibrary();
  const current = educationKey(title);
  const [education, setEducation] = useState(educations.some(item => item.id === current) ? current : educations[0]?.id ?? "");
  const [slot, setSlot] = useState("1");
  const [choosing, setChoosing] = useState(false);
  const [choiceError, setChoiceError] = useState("");
  const selected = images.find(image => image.education === education && String(image.slot) === slot);
  async function choose() {
    if (!selected || choosing) return;
    setChoosing(true); setChoiceError("");
    try { onChoose(await snapshotLibraryImage(selected)); }
    catch (cause) { setChoiceError(cause instanceof Error ? cause.message : "Bilden kunde inte väljas."); }
    finally { setChoosing(false); }
  }
  return <div className="sheet-image-picker">
    <h3>Välj från bildbiblioteket</h3>
    <div className="field"><label htmlFor="image-education">Utbildning</label><select id="image-education" value={education} onChange={event => { setEducation(event.target.value); setSlot("1"); }}>{educations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
    {!educations.some(item => item.id === current) ? <small>Välj en passande utbildningsbild ur bildbiblioteket.</small> : education !== current ? <button type="button" className="text-button" onClick={() => { setEducation(current); setSlot("1"); }}>Visa bilder för aktuellt blad</button> : <small>Kopplat till bladets utbildning: {title}</small>}
    {loading ? <p role="status">Läser bilder …</p> : error ? <p role="alert">{error}</p> : <>
      <div className="field"><label htmlFor="image-variant">Bildvariant</label><select id="image-variant" value={slot} onChange={event => setSlot(event.target.value)}>{[1, 2].map(value => <option key={value} value={value}>Bild {value}{images.some(image => image.education === education && image.slot === value) ? "" : " – saknas"}</option>)}</select></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {selected ? <img className="library-choice-preview" src={appPath(selected.dataUrl)} alt={`Bild ${slot} för ${education}`} /> : <p className="library-choice-empty">Bild {slot} saknas för den här utbildningen. Lägg till den i Inställningar.</p>}
      <button type="button" className="use-library-image" disabled={!selected || choosing} onClick={() => void choose()}>{choosing ? "Hämtar bild …" : `Använd bild ${slot} på bladet`}</button>
      {choiceError && <p role="alert">{choiceError}</p>}
    </>}
    <button type="button" className="text-button" onClick={onManage}>Hantera bildbibliotek →</button>
  </div>;
}
