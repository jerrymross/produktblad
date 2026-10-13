"use client";
import { appPath } from "@/lib/app-path";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { schools } from "@/lib/catalog";

export function Accounts() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [selected, setSelected] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [invitedRole, setInvitedRole] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setUrl("");
    try {
      const response = await fetch(appPath("/api/invitations"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, central: role === "admin", schools: role === "admin" ? [] : selected }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setUrl(result.url); setInvitedRole(role === "admin" ? "Admin" : "Vanlig användare");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Försök igen."); }
    finally { setBusy(false); }
  }
  return <main className="accounts-page"><Link href="/admin">← Adminläge</Link><h1>Bjud in en användare</h1>
    <p>Välj roll och skapa en inbjudningslänk. Länken gäller i sju dagar; du delar den själv.</p>
    <form onSubmit={submit}><fieldset disabled={busy} className="invite-fields"><legend className="sr-only">Ny inbjudan</legend>
      <label>E-post<input type="email" required maxLength={254} value={email} onChange={event => { setEmail(event.target.value); setUrl(""); }} autoComplete="email" /></label>
      <fieldset className="invite-role"><legend>Roll</legend>
        <label><input type="radio" name="invite-role" value="user" checked={role === "user"} onChange={() => { setRole("user"); setUrl(""); }} />Vanlig användare <small>Kan arbeta med produktblad för de skolor du väljer.</small></label>
        <label><input type="radio" name="invite-role" value="admin" checked={role === "admin"} onChange={() => { setRole("admin"); setUrl(""); }} />Admin <small>Har tillgång till alla skolor, bildbiblioteket och användaradministrationen.</small></label>
      </fieldset>
      {role === "user" ? <fieldset><legend>Skolor – välj minst en</legend>{schools.map(school => <label key={school}><input type="checkbox" checked={selected.includes(school)} onChange={event => { setSelected(current => event.target.checked ? [...current, school] : current.filter(item => item !== school)); setUrl(""); }} />{school}</label>)}</fieldset> : <p className="invite-admin-note">Admin får åtkomst till alla skolor.</p>}
      <button className="save-button" disabled={role === "user" && selected.length === 0}>Skapa inbjudningslänk</button>
    </fieldset><p role="alert">{error}</p>
    {url && <div className="invite-result" role="status"><strong>Inbjudan skapad · {invitedRole}</strong><label>Inbjudningslänk<input readOnly value={url} onFocus={event => event.target.select()} /></label><Link href="/admin#invitations">Se alla inbjudningar</Link></div>}
    </form></main>;
}
