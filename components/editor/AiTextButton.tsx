"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { appPath } from "@/lib/app-path";
import { aiTextFields, type AiTextField, type AiTextResult } from "@/lib/ai-text";

type Props={field:AiTextField;sheetUrl:string;currentText:string;disabled:boolean;onApply:(text:string)=>void};
export function AiTextButton(props:Props){
  const [open,setOpen]=useState(false);
  return <><button type="button" className="ai-text-trigger" disabled={props.disabled} aria-label={`Skapa textförslag: ${aiTextFields[props.field].label}`} onClick={()=>setOpen(true)}>Skapa textförslag</button>
    {open&&createPortal(<AiTextDialog {...props} onClose={()=>setOpen(false)}/>,document.body)}</>;
}
function AiTextDialog({field,sheetUrl,currentText,disabled,onApply,onClose}:Props&{onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null),request=useRef<AbortController|null>(null);
  const [facts,setFacts]=useState(""),[proposal,setProposal]=useState(""),[missing,setMissing]=useState<string[]>([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[generated,setGenerated]=useState(false);
  const [limit,setLimit]=useState<number>(aiTextFields[field].limit);
  const [sourceUrl,setSourceUrl]=useState("");
  const [source,setSource]=useState<{url:string;title:string;fetchedAt:string;truncated:boolean}|null>(null);
  const [sourceReviewed,setSourceReviewed]=useState(false);
  async function fetchSource(){
    if(disabled||busy)return;
    if(facts.trim()&&!window.confirm("Ersätta faktaunderlaget i rutan med text från astar.se? Bladets text ändras inte."))return;
    const controller=new AbortController();request.current=controller;setBusy(true);setError("");
    try{
      const response=await fetch(appPath(`${sheetUrl}/ai/source`),{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({url:sourceUrl.trim()})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Källan kunde inte hämtas.");
      setFacts(result.text);setSource(result);setSourceReviewed(false);setGenerated(false);setProposal("");setMissing([]);
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Källan kunde inte hämtas.");}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  useEffect(()=>{dialog.current?.showModal();return()=>request.current?.abort();},[]);
  async function generate(action:"generate"|"shorten"){
    if(disabled||busy||(action==="generate"&&source&&!sourceReviewed))return;
    const controller=new AbortController();request.current=controller;setBusy(true);setError("");
    try{
      const response=await fetch(appPath(`${sheetUrl}/ai`),{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",signal:controller.signal,
        body:JSON.stringify({field,action,facts,currentText:action==="shorten"?(proposal||currentText):currentText})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Textförslaget kunde inte skapas.");
      const answer=result as AiTextResult;
      setProposal(answer.text);setMissing(answer.missingFacts);setLimit(answer.maxCharacters);setGenerated(true);
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"AI-tjänsten kunde inte nås.");}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  function apply(){
    if(disabled||busy||!proposal.trim()||proposal.length>limit)return;
    if(currentText.trim()&&!window.confirm("Ersätta texten i det här fältet med det granskade förslaget? Övriga fält ändras inte."))return;
    onApply(proposal.trim());onClose();
  }
  return <dialog ref={dialog} className="ai-text-dialog" aria-labelledby="ai-text-title" onCancel={onClose} onClose={onClose}>
    <header><div><span className="eyebrow-ui">TEXTFÖRSLAG</span><h2 id="ai-text-title">{aiTextFields[field].label}</h2></div><button type="button" className="dialog-close" onClick={onClose}>Stäng</button></header>
    <p>Hämta underlag från utbildningens sida på astar.se eller skriv egna bekräftade fakta. AI ger ett förslag som du granskar innan du lägger in det i bladet.</p>
    <label htmlFor="ai-source-url">Utbildningssida på astar.se</label>
    <input id="ai-source-url" type="url" maxLength={2000} value={sourceUrl} disabled={busy||disabled} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://astar.se/…"/>
    <div className="ai-text-actions"><button type="button" className="secondary-button" disabled={busy||disabled||!sourceUrl.trim()} onClick={()=>void fetchSource()}>Hämta från astar.se</button></div>
    {source&&<div role="status"><p>Hämtad källa: <a href={source.url} target="_blank" rel="noreferrer">{source.title||source.url}</a> · {new Date(source.fetchedAt).toLocaleString("sv-SE")}</p>{source.truncated&&<p>Endast de första 6 000 tecknen kunde hämtas. Kontrollera om uppgifter för detta textfält saknas.</p>}</div>}
    <label htmlFor="ai-text-facts">Bekräftat faktaunderlag</label>
    <textarea id="ai-text-facts" rows={5} maxLength={6000} value={facts} disabled={busy||disabled} onChange={e=>setFacts(e.target.value)} placeholder="Till exempel kursmoment, arbetssätt och vilka arbetsuppgifter utbildningen förbereder för."/>
    <small>Behåll bara uppgifter för rätt utbildning, ort och utbildningsform. Ta bort menyer, kontaktpersoner och andra irrelevanta uppgifter. Komplettera saknade fakta; AI ska inte gissa.</small>
    {source&&<label><input type="checkbox" checked={sourceReviewed} disabled={busy||disabled} onChange={e=>setSourceReviewed(e.target.checked)}/> Jag har granskat underlaget och kontrollerat utbildning, ort och utbildningsform.</label>}
    <div className="ai-text-actions"><button type="button" className="primary-button" disabled={busy||disabled||facts.trim().length<10||Boolean(source&&!sourceReviewed)} onClick={()=>void generate('generate')}>{busy?"Arbetar …":generated?"Skapa nytt förslag":"Skapa förslag"}</button><button type="button" className="secondary-button" disabled={busy||disabled||!(proposal||currentText).trim()} onClick={()=>void generate('shorten')}>Gör kortare</button></div>
    {error&&<p role="alert" className="ai-text-error">{error}</p>}
    {disabled&&<p role="alert">Bladet kan inte redigeras just nu. Förslaget finns kvar tills du stänger rutan.</p>}
    {generated&&<section className="ai-text-review" aria-label="Granska textförslag"><h3>Granska förslaget</h3>
      {missing.length>0&&<div role="status"><p>Kontrollera eller komplettera:</p><ul>{missing.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}
      <label htmlFor="ai-text-proposal">Textförslag</label><textarea id="ai-text-proposal" rows={7} maxLength={limit} value={proposal} disabled={busy||disabled} onChange={e=>setProposal(e.target.value)}/>
      <small>{proposal.length} av {limit} tecken. Kontrollera även att texten ryms i A4-förhandsvisningen.</small>
      <button type="button" className="primary-button" disabled={busy||disabled||!proposal.trim()||proposal.length>limit} onClick={apply}>Använd text</button>
      <p>Texten läggs in i det valda fältet. Spara utkast när du är nöjd.</p>
    </section>}
    {currentText&&<details><summary>Befintlig text</summary><p className="ai-existing-text">{currentText}</p></details>}
  </dialog>;
}
