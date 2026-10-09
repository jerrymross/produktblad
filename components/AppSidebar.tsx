"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ImageLibrary } from "@/components/images/ImageLibrary";
import {cloud} from "@/lib/cloud-client";
import {createAuthClient} from "better-auth/react";
import {useRouter} from "next/navigation";

export function AppSidebar({ dirty = false, example = false, currentTitle = "Kock" }: { dirty?: boolean; example?: boolean; currentTitle?: string }) {
  const router=useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const [admin,setAdmin]=useState(false);
  useEffect(()=>{void cloud<{admin:boolean}>("/api/me").then(profile=>setAdmin(profile.admin)).catch(()=>undefined);},[]);
  function openSettings() { setOpened(true); dialog.current?.showModal(); }
  useEffect(() => {
    const open = () => { setOpened(true); dialog.current?.showModal(); };
    window.addEventListener("open-image-settings", open);
    return () => window.removeEventListener("open-image-settings", open);
  }, []);
  function canLeave() { return !dirty || window.confirm("Lämna bladet med osparade ändringar? Spara utkast först om du vill behålla dem."); }
  return <>
    <aside className="app-sidebar" aria-label="Huvudmeny">
      <Link href="/produktblad" className="sidebar-brand" aria-label="Astar Studio – bibliotek" onClick={event => { if (!canLeave()) event.preventDefault(); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/astar-studio-logo-staende.png" alt="Astar Studio" width="1186" height="1326" />
      </Link>
      <nav>
        <Link href="/produktblad" className={!example ? "selected" : ""} onClick={event => { if (!canLeave()) event.preventDefault(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l4 4v16H6zM14 2v5h4M9 11h6M9 15h6M9 18h4" /></svg>Bibliotek</Link>
        <Link href="/?exempel=1" className={example ? "selected" : ""} title="Öppna Mall 01 med exempeldata" onClick={event => { if (!canLeave()) event.preventDefault(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2h10l4 4v16H5zM8 9h8M8 13h3v5H8zM14 13h2M14 17h2" /></svg>Mallar</Link>
        <button type="button" onClick={openSettings}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3 1-2h4l1 2 3 2 2 1-1 4 1 4-2 1-3 2-1 3h-4l-1-3-3-2-2-1 1-4-1-4 2-1z" /><circle cx="12" cy="10" r="3" /></svg>Inställningar</button>
      </nav>
      {admin&&<Link className="sidebar-account-link" href="/accounts" onClick={event=>{if(!canLeave())event.preventDefault();}}>Bjud in kollega</Link>}
      <button type="button" className="sidebar-signout" onClick={()=>{if(canLeave())void createAuthClient().signOut().then(()=>{router.push("/login");router.refresh();});}}>Logga ut</button>
      <span className="sidebar-local" title="Utkast sparas i det gemensamma biblioteket">Gemensamt bibliotek</span>
    </aside>
    <dialog ref={dialog} className="settings-dialog image-settings-dialog" aria-labelledby="settings-title">
      <div className="image-settings-header"><div><span className="eyebrow-ui">INSTÄLLNINGAR</span><h2 id="settings-title">Bildbibliotek</h2></div><form method="dialog"><button className="dialog-close">Stäng</button></form></div>
      {opened && <ImageLibrary currentTitle={currentTitle} />}
      <details className="local-settings-info"><summary>Om sparning och återställning</summary><p>Utkast sparas i det gemensamma biblioteket. Använd Spara utkast eller Ctrl+S / ⌘S. Versionshistoriken behålls när du återställer ett blad.</p></details>
    </dialog>
  </>;
}
