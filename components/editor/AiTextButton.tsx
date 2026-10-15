"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { appPath } from "@/lib/app-path";
import { aiTextFields, type AiTextField, type AiTextResult } from "@/lib/ai-text";
import type { EducationCandidate } from "@/lib/astar-search";
import { isAiQuota, type AiQuota } from "@/lib/ai-quota";

function AiQuotaStatus({sheetUrl,revision}:{sheetUrl:string;revision:number}){
  const [quota,setQuota]=useState<AiQuota|null>(null),[failed,setFailed]=useState(false);
  useEffect(()=>{
    let active=true,controller:AbortController;
    async function refresh(){
      controller?.abort();controller=new AbortController();const signal=controller.signal;
      try{
        const response=await fetch(appPath(`${sheetUrl}/ai/quota`),{cache:"no-store",signal});
        const value=await response.json();
        if(!response.ok||!isAiQuota(value))throw new Error();
        if(active&&!signal.aborted){setQuota(value);setFailed(false);}
      }catch{if(active&&!signal.aborted){setQuota(null);setFailed(true);}}
    }
    void refresh();const timer=setInterval(()=>void refresh(),30000);
    return()=>{active=false;clearInterval(timer);controller?.abort();};
  },[sheetUrl,revision]);
  return <aside className="ai-quota" aria-label="Dagens AI-kvot" aria-live="polite">
    {quota?<><strong>{quota.unlimited?"Ditt konto: obegränsad AI-kvot":"AI-tokens kvar i dag: "+quota.remaining.toLocaleString("sv-SE")}</strong>
      <small>{quota.unlimited?`${quota.remaining.toLocaleString("sv-SE")} tokens kvar i den gemensamma dagskvoten. `:"Gemensam kvot för Astar Studio. "}{quota.reserved.toLocaleString("sv-SE")} av {quota.limit.toLocaleString("sv-SE")} tokens reserverade.</small>
      <small>Återställs {new Date(quota.resetsAt).toLocaleString("sv-SE",{timeZone:"Europe/Stockholm",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})} (svensk tid). {quota.unlimited?"Administratörer är undantagna från kvoten.":"Antals- och minutgränser kan också begränsa användningen."}</small>
      {!quota.enabled&&<small>AI-tjänsten är pausad.</small>}</>:<small>{failed?"Dagens AI-kvot kunde inte hämtas. Försöker igen automatiskt.":"Hämtar dagens AI-kvot …"}</small>}
  </aside>;
}

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
  const [candidates,setCandidates]=useState<EducationCandidate[]>([]);
  const [searchMessage,setSearchMessage]=useState("");
  const [stage,setStage]=useState("");
  const [quotaRevision,setQuotaRevision]=useState(0);
  async function createProposal(action:"generate"|"shorten",underlag:string,signal:AbortSignal){
    try{
    setSourceReviewed(false);
    setStage("Skapar textförslag …");
    const response=await fetch(appPath(`${sheetUrl}/ai`),{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",signal,
      body:JSON.stringify({field,action,facts:underlag,currentText:action==="shorten"?(proposal||currentText):currentText})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||"Textförslaget kunde inte skapas.");
    const answer=result as AiTextResult;
    setProposal(answer.text);setMissing(answer.missingFacts);setLimit(answer.maxCharacters);setGenerated(true);
    }finally{if(!signal.aborted)setQuotaRevision(value=>value+1);}
  }
  async function search(initial=false){
    if(disabled||(!initial&&busy))return;
    if(!initial&&facts.trim()&&!window.confirm("Söka på nytt och ersätta underlaget? Bladets text ändras inte."))return;
    const controller=new AbortController();request.current=controller;setBusy(true);setError("");setStage("Söker utbildningen på astar.se …");
    try{
      const response=await fetch(appPath(`${sheetUrl}/ai/search`),{method:"POST",signal:controller.signal});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Sökningen misslyckades.");
      setCandidates(result.candidates);setSearchMessage(result.message);
      setSource(null);setFacts("");setGenerated(false);setProposal("");setMissing([]);setSourceReviewed(false);
      if(result.source){
        setFacts(result.source.text);setSource(result.source);setSourceUrl(result.source.url);setSourceReviewed(false);setGenerated(false);setProposal("");setMissing([]);
        await createProposal("generate",result.source.text,controller.signal);
      }
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Sökningen misslyckades.");}
    finally{if(!controller.signal.aborted){setBusy(false);setStage("");}}
  }
  const startSearch=useEffectEvent(()=>{void search(true);});
  async function fetchSource(selectedUrl=sourceUrl.trim()){
    if(disabled||busy)return;
    if(facts.trim()&&!window.confirm("Ersätta faktaunderlaget i rutan med text från astar.se? Bladets text ändras inte."))return;
    const controller=new AbortController();request.current=controller;setBusy(true);setError("");setStage("Hämtar utbildningssidan …");
    try{
      const response=await fetch(appPath(`${sheetUrl}/ai/source`),{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({url:selectedUrl})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Källan kunde inte hämtas.");
      setFacts(result.text);setSource(result);setSourceUrl(result.url);setSourceReviewed(false);setGenerated(false);setProposal("");setMissing([]);
      setSearchMessage("Underlaget har hämtats från den valda utbildningssidan.");
      await createProposal("generate",result.text,controller.signal);
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Källan kunde inte hämtas.");}
    finally{if(!controller.signal.aborted){setBusy(false);setStage("");}}
  }
  useEffect(()=>{
    dialog.current?.showModal();
    // Let the dialog paint before starting discovery; cancel the queued work on unmount.
    const timer=setTimeout(()=>startSearch(),0);
    return()=>{clearTimeout(timer);request.current?.abort();};
  },[]);
  async function generate(action:"generate"|"shorten"){
    if(disabled||busy)return;
    const controller=new AbortController();request.current=controller;setBusy(true);setError("");
    try{
      await createProposal(action,facts,controller.signal);
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"AI-tjänsten kunde inte nås.");}
    finally{if(!controller.signal.aborted){setBusy(false);setStage("");}}
  }
  function apply(){
    if(disabled||busy||!proposal.trim()||proposal.length>limit||(source&&!sourceReviewed))return;
    if(currentText.trim()&&!window.confirm("Ersätta texten i det här fältet med det granskade förslaget? Övriga fält ändras inte."))return;
    onApply(proposal.trim());onClose();
  }
  return <dialog ref={dialog} className="ai-text-dialog" aria-labelledby="ai-text-title" onCancel={onClose} onClose={onClose}>
    <header><div><span className="eyebrow-ui">TEXTFÖRSLAG</span><h2 id="ai-text-title">{aiTextFields[field].label}</h2></div><button type="button" className="dialog-close" onClick={onClose}>Stäng</button></header>
    <AiQuotaStatus sheetUrl={sheetUrl} revision={quotaRevision}/>
    <p>Vi söker efter bladets utbildning, skola och utbildningstyp på astar.se. Vid en tydlig träff hämtas underlaget och AI skapar ett textförslag automatiskt.</p>
    <p role="status">{stage||searchMessage}</p>
    <button type="button" className="secondary-button" disabled={busy||disabled} onClick={()=>void search()}>Sök igen på astar.se</button>
    {candidates.length>0&&<details open={!source}><summary>Visa träffar / välj utbildningssida</summary><section aria-label="Välj utbildningssida">{candidates.map(candidate=><div key={candidate.url}><p><a href={candidate.url} target="_blank" rel="noreferrer">{candidate.title}</a><br/>{candidate.schools.join(", ")||"Skola saknas"} · {candidate.programs.join(", ")||"Utbildningstyp saknas"}<br/>{candidate.reason}</p><button type="button" className="secondary-button" disabled={busy||disabled} onClick={()=>void fetchSource(candidate.url)}>Välj och skapa förslag</button></div>)}</section></details>}
    <details><summary>Ange egen länk</summary>
    <label htmlFor="ai-source-url">Utbildningssida på astar.se</label>
    <input id="ai-source-url" type="url" maxLength={2000} value={sourceUrl} disabled={busy||disabled} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://astar.se/…"/>
    <div className="ai-text-actions"><button type="button" className="secondary-button" disabled={busy||disabled||!sourceUrl.trim()} onClick={()=>void fetchSource()}>Hämta från astar.se</button></div>
    </details>
    {source&&<div role="status"><p>Hämtad källa: <a href={source.url} target="_blank" rel="noreferrer">{source.title||source.url}</a> · {new Date(source.fetchedAt).toLocaleString("sv-SE")}</p>{source.truncated&&<p>Endast de första 6 000 tecknen kunde hämtas. Kontrollera om uppgifter för detta textfält saknas.</p>}</div>}
    <details open={!generated}><summary>Granska eller komplettera faktaunderlaget</summary>
    <label htmlFor="ai-text-facts">{source?"Faktaunderlag från källan":"Eget faktaunderlag"}</label>
    <textarea id="ai-text-facts" rows={5} maxLength={6000} value={facts} disabled={busy||disabled} onChange={e=>setFacts(e.target.value)} placeholder="Till exempel kursmoment, arbetssätt och vilka arbetsuppgifter utbildningen förbereder för."/>
    <small>Behåll bara uppgifter för rätt utbildning, ort och utbildningsform. Ta bort menyer, kontaktpersoner och andra irrelevanta uppgifter. Komplettera saknade fakta; AI ska inte gissa.</small>
    <div className="ai-text-actions"><button type="button" className="primary-button" disabled={busy||disabled||facts.trim().length<10} onClick={()=>void generate('generate')}>{busy?"Arbetar …":generated?"Skapa nytt förslag":"Skapa förslag"}</button><button type="button" className="secondary-button" disabled={busy||disabled||!(proposal||currentText).trim()} onClick={()=>void generate('shorten')}>Gör kortare</button></div>
    </details>
    {error&&<p role="alert" className="ai-text-error">{error}</p>}
    {disabled&&<p role="alert">Bladet kan inte redigeras just nu. Förslaget finns kvar tills du stänger rutan.</p>}
    {generated&&<section className="ai-text-review" aria-label="Granska textförslag"><h3>Granska förslaget</h3>
      {missing.length>0&&<div role="status"><p>Kontrollera eller komplettera:</p><ul>{missing.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}
      <label htmlFor="ai-text-proposal">Textförslag</label><textarea id="ai-text-proposal" rows={7} maxLength={limit} value={proposal} disabled={busy||disabled} onChange={e=>setProposal(e.target.value)}/>
      <small>{proposal.length} av {limit} tecken. Kontrollera även att texten ryms i A4-förhandsvisningen.</small>
      {source&&<label><input type="checkbox" checked={sourceReviewed} disabled={busy||disabled} onChange={e=>setSourceReviewed(e.target.checked)}/> Jag har granskat förslaget och källan samt kontrollerat utbildning, ort och utbildningstyp.</label>}
      <button type="button" className="primary-button" disabled={busy||disabled||!proposal.trim()||proposal.length>limit||Boolean(source&&!sourceReviewed)} onClick={apply}>Använd text</button>
      <p>Texten läggs in i det valda fältet. Spara utkast när du är nöjd.</p>
    </section>}
    {currentText&&<details><summary>Befintlig text</summary><p className="ai-existing-text">{currentText}</p></details>}
  </dialog>;
}
