"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cloud, jsonRequest } from "@/lib/cloud-client";
export function AcceptPortalInvitation({token,email}:{token:string;email:string}) {
  const [error,setError]=useState(""),[busy,setBusy]=useState(false);
  const router=useRouter();
  return <main className="login-page"><section className="login-card"><h1>Bekräfta din skolåtkomst</h1><p>Du är inloggad via Astar Studio som {email}. Acceptera den åtkomst som Produktblad-administratören har valt i inbjudan.</p><p role="alert">{error}</p><button className="save-button" disabled={busy||!token} onClick={()=>{setBusy(true);void cloud("/api/invitations/accept",jsonRequest("POST",{token})).then(()=>{router.push("/produktblad");router.refresh();}).catch(cause=>{setError(cause instanceof Error?cause.message:"Försök igen.");setBusy(false);});}}>Acceptera inbjudan</button></section></main>;
}
