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
  useEffect(()=>{dialog.current?.showModal();return()=>request.current?.abort();},[]);
  async function generate(action:"generate"|"shorten"){
    if(disabled||busy)return;
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
    <p>Beskriv bekräftade fakta om utbildningen. AI ger ett förslag som du granskar innan du lägger in det i bladet.</p>
    <label htmlFor="ai-text-facts">Bekräftat faktaunderlag</label>
    <textarea id="ai-text-facts" rows={5} maxLength={6000} value={facts} disabled={busy||disabled} onChange={e=>setFacts(e.target.value)} placeholder="Till exempel kursmoment, arbetssätt och vilka arbetsuppgifter utbildningen förbereder för."/>
    <small>Ta bara med uppgifter som gäller denna utbildning. Undvik personuppgifter. AI hämtar inte fakta från webben.</small>
    <div className="ai-text-actions"><button type="button" className="primary-button" disabled={busy||disabled||facts.trim().length<10} onClick={()=>void generate('generate')}>{busy?"Skapar förslag …":generated?"Skapa nytt förslag":"Skapa förslag"}</button><button type="button" className="secondary-button" disabled={busy||disabled||!(proposal||currentText).trim()} onClick={()=>void generate('shorten')}>Gör kortare</button></div>
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
