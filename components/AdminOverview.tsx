"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cloud } from "@/lib/cloud-client";
import type { AdminOverviewData } from "@/lib/admin-types";

const dateFormat = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Stockholm" });
const formatDate = (date: string) => dateFormat.format(new Date(date));
const roleLabel = (role: string) => role === "admin" ? "Admin" : "Vanlig användare";
const statusLabel = { pending: "Väntar på svar", accepted: "Accepterad", expired: "Utgången" };
const schoolLabel = (school: string) => school === "__templates__" ? "Gemensam mall" : school;
const sheetLink = (id: string) => id === "example" ? "/?exempel=1" : `/?blad=${encodeURIComponent(id)}`;

export function AdminOverview() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberRole, setMemberRole] = useState("all");
  const [activityQuery, setActivityQuery] = useState("");
  const [activitySchool, setActivitySchool] = useState("all");
  const [inviteStatus, setInviteStatus] = useState("all");
  useEffect(() => {
    const controller = new AbortController();
    cloud<AdminOverviewData>("/api/admin/overview", { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Översikten kunde inte hämtas.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  const memberSearch = memberQuery.trim().toLocaleLowerCase("sv");
  const activitySearch = activityQuery.trim().toLocaleLowerCase("sv");
  const members = data?.members.filter(member => (memberRole === "all" || member.role === memberRole) && [member.name, member.email, ...member.schools].join(" ").toLocaleLowerCase("sv").includes(memberSearch)) ?? [];
  const activity = data?.activity.filter(item => (activitySchool === "all" || item.school === activitySchool) && [item.title, item.name, item.email, schoolLabel(item.school)].join(" ").toLocaleLowerCase("sv").includes(activitySearch)) ?? [];
  const invitations = data?.invitations.filter(invite => inviteStatus === "all" || invite.status === inviteStatus) ?? [];
  const activitySchools = [...new Set(data?.activity.map(item => item.school) ?? [])].sort((a, b) => a.localeCompare(b, "sv"));
  return <div className="admin-overview">
    <div className="admin-refresh"><p role="status">{loading ? "Hämtar medlemsregister och ändringslogg …" : data ? `Hämtat ${formatDate(data.loadedAt)}` : "Översikten har inte hämtats."}</p><button type="button" disabled={loading} onClick={() => { setLoading(true); setError(""); setRefresh(value => value + 1); }}>Uppdatera översikten</button></div>
    {error && <p role="alert" className="admin-error">{error}{data ? " Tidigare hämtade uppgifter visas nedan." : ""}</p>}
    {data && <>
      <div className="admin-summary" aria-label="Medlemsöversikt">
        <a href="#members"><strong>{data.members.length}</strong><span>Medlemmar</span></a>
        <a href="#members"><strong>{data.members.filter(member => member.role === "admin").length}</strong><span>Admin</span></a>
        <a href="#invitations"><strong>{data.invitations.filter(invite => invite.status === "pending").length}</strong><span>Väntande inbjudningar</span></a>
      </div>
      <section id="activity" className="admin-panel" aria-labelledby="activity-title">
        <h2 id="activity-title">Senast ändrade produktblad</h2><p>De 100 senaste sparade ändringarna, med vem som sparade varje version. Osparade ändringar visas inte.</p>
        <div className="admin-filters"><label>Sök i ändringsloggen<input type="search" value={activityQuery} onChange={event => setActivityQuery(event.target.value)} placeholder="Produktblad, namn eller e-post" /></label>
          <label>Skola<select value={activitySchool} onChange={event => setActivitySchool(event.target.value)}><option value="all">Alla skolor</option>{activitySchools.map(school => <option key={school} value={school}>{schoolLabel(school)}</option>)}</select></label></div>
        <div className="admin-table-scroll"><table><caption className="sr-only">Sparade produktbladsändringar</caption><thead><tr><th scope="col">Tidpunkt</th><th scope="col">Produktblad</th><th scope="col">Skola</th><th scope="col">Ändrat av</th><th scope="col">Version</th></tr></thead><tbody>{activity.map(item => <tr key={`${item.sheetId}:${item.revision}`}><td><time dateTime={item.changedAt}>{formatDate(item.changedAt)}</time></td><td><Link href={sheetLink(item.sheetId)}>{item.title}</Link></td><td>{schoolLabel(item.school)}</td><td>{item.name || item.email || "Uppgift saknas"}{item.name && item.email && <small>{item.email}</small>}</td><td>{item.revision}</td></tr>)}</tbody></table></div>
        {!activity.length && <p className="admin-empty">{data.activity.length ? "Inga ändringar matchar dina filter." : "Inga produktblad har sparade ändringar ännu."}</p>}
      </section>
      <section id="members" className="admin-panel" aria-labelledby="members-title">
        <h2 id="members-title">Medlemsregister</h2><p>Konton som har skapats, deras roller och skolåtkomst.</p>
        <div className="admin-filters"><label>Sök medlem<input type="search" value={memberQuery} onChange={event => setMemberQuery(event.target.value)} placeholder="Namn, e-post eller skola" /></label><label>Roll<select value={memberRole} onChange={event => setMemberRole(event.target.value)}><option value="all">Alla roller</option><option value="admin">Admin</option><option value="user">Vanlig användare</option></select></label></div>
        <div className="admin-table-scroll"><table><caption className="sr-only">Medlemmar och behörigheter</caption><thead><tr><th scope="col">Medlem</th><th scope="col">Roll</th><th scope="col">Skolor</th><th scope="col">Konto skapat</th></tr></thead><tbody>{members.map(member => <tr key={member.id}><td>{member.name || "Namn saknas"}<small>{member.email}</small></td><td><span className={`admin-badge role-${member.role}`}>{roleLabel(member.role)}</span></td><td>{member.role === "admin" ? "Alla skolor" : member.schools.length ? member.schools.join(", ") : "Ingen skola tilldelad"}</td><td><time dateTime={member.createdAt}>{formatDate(member.createdAt)}</time></td></tr>)}</tbody></table></div>
        {!members.length && <p className="admin-empty">{data.members.length ? "Inga medlemmar matchar dina filter." : "Inga medlemskonton finns ännu."}</p>}
      </section>
      <section id="invitations" className="admin-panel" aria-labelledby="invitations-title">
        <div className="admin-panel-heading"><h2 id="invitations-title">Inbjudningar</h2><Link href="/accounts">Bjud in användare →</Link></div>
        <label className="admin-invite-filter">Status<select value={inviteStatus} onChange={event => setInviteStatus(event.target.value)}><option value="all">Alla inbjudningar</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="admin-table-scroll"><table><caption className="sr-only">Skapade inbjudningar</caption><thead><tr><th scope="col">E-post</th><th scope="col">Roll</th><th scope="col">Skolor</th><th scope="col">Status</th><th scope="col">Giltig till / accepterad</th></tr></thead><tbody>{invitations.map(invite => <tr key={invite.id}><td>{invite.email}</td><td>{roleLabel(invite.role)}</td><td>{invite.role === "admin" ? "Alla skolor" : invite.schools.join(", ") || "Ingen skola"}</td><td><span className={`admin-badge status-${invite.status}`}>{statusLabel[invite.status]}</span></td><td><time dateTime={invite.usedAt ?? invite.expiresAt}>{formatDate(invite.usedAt ?? invite.expiresAt)}</time></td></tr>)}</tbody></table></div>
        {!invitations.length && <p className="admin-empty">{data.invitations.length ? "Inga inbjudningar matchar ditt filter." : "Inga inbjudningar finns ännu."}</p>}
      </section>
    </>}
  </div>;
}
