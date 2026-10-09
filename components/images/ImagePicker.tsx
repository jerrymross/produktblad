"use client";
import { useState } from "react";
import { educationKey, educations } from "@/lib/image-library";
import { useImageLibrary } from "./useImageLibrary";

export function ImagePicker({ title, onChoose, onManage }: { title: string; onChoose: (image: string) => void; onManage: () => void }) {
  const { images, loading, error } = useImageLibrary();
  const current = educationKey(title);
  const [education, setEducation] = useState(current);
  const [slot, setSlot] = useState("1");
  const selected = images.find(image => image.education === education && String(image.slot) === slot);
  return <div className="sheet-image-picker">
    <h3>Välj från bildbiblioteket</h3>
    <div className="field"><label htmlFor="image-education">Utbildning</label><select id="image-education" value={education} onChange={event => { setEducation(event.target.value); setSlot("1"); }}>{educations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
    {education !== current ? <button type="button" className="text-button" onClick={() => { setEducation(current); setSlot("1"); }}>Visa bilder för aktuellt blad</button> : <small>Kopplat till bladets utbildning: {title}</small>}
    {loading ? <p role="status">Läser bilder …</p> : error ? <p role="alert">{error}</p> : <>
      <div className="field"><label htmlFor="image-variant">Bildvariant</label><select id="image-variant" value={slot} onChange={event => setSlot(event.target.value)}>{[1, 2].map(value => <option key={value} value={value}>Bild {value}{images.some(image => image.education === education && image.slot === value) ? "" : " – saknas"}</option>)}</select></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {selected ? <img className="library-choice-preview" src={selected.dataUrl} alt={`Bild ${slot} för ${education}`} /> : <p className="library-choice-empty">Bild {slot} saknas för den här utbildningen. Lägg till den i Inställningar.</p>}
      <button type="button" className="use-library-image" disabled={!selected} onClick={() => { if (selected) onChoose(selected.dataUrl); }}>Använd bild {slot} på bladet</button>
    </>}
    <button type="button" className="text-button" onClick={onManage}>Hantera bildbibliotek →</button>
  </div>;
}
