"use client";
import { useState,type FormEvent } from "react";
import { createAuthClient } from "better-auth/react";
import {useRouter} from "next/navigation";
const authClient=createAuthClient();
export function Login({invite}:{invite?:string}) {
  const router=useRouter();
  const [email,setEmail]=useState("");const [name,setName]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent) {event.preventDefault();setBusy(true);setError("");try {
    let accountEmail=email;
    if(invite){const response=await fetch("/api/invitations/accept",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:invite,name,password})});const result=await response.json();if(!response.ok)throw new Error(result.error);accountEmail=result.email;}
    const result=await authClient.signIn.email({email:accountEmail,password});if(result.error)throw new Error("Inloggningen misslyckades. Kontrollera e-post och lösenord.");router.push("/produktblad");router.refresh();
  }catch(error){setError(error instanceof Error?error.message:"Försök igen.");}finally{setBusy(false);}}
  return <main className="login-page"><form className="login-card" onSubmit={submit}><span className="eyebrow-ui">ASTAR STUDIO</span><h1>{invite?"Skapa ditt konto":"Välkommen tillbaka"}</h1><p>{invite?"Välj ditt lösenord för att öppna skolornas produktblad.":"Logga in för att öppna och spara produktblad."}</p>{invite?<label>Ditt namn<input value={name} onChange={event=>setName(event.target.value)} autoComplete="name" required maxLength={100}/></label>:<label>E-post<input type="email" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="username" required/></label>}<label>Lösenord<input type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete={invite?"new-password":"current-password"} minLength={invite?12:undefined} maxLength={128} required/></label>{invite&&<small>Minst 12 tecken. Kontot får behörigheten i din inbjudan.</small>}<p role="alert">{error}</p><button className="save-button" disabled={busy}>{busy?"Vänta …":invite?"Skapa konto och logga in":"Logga in"}</button><small>Behöver du ett konto? Be din centrala administratör om en inbjudan.</small></form></main>;
}
