"use client";

import Link from "next/link";
import { useRef } from "react";

export function AppSidebar({ dirty = false, example = false }: { dirty?: boolean; example?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  function canLeave() { return !dirty || window.confirm("Lämna bladet med osparade ändringar? Spara utkast först om du vill behålla dem."); }
  return <>
    <aside className="app-sidebar" aria-label="Huvudmeny">
      <Link href="/produktblad" className="sidebar-brand" aria-label="Astar – bibliotek" onClick={event => { if (!canLeave()) event.preventDefault(); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo_stand.png" alt="Astar Education" width="497" height="555" />
      </Link>
      <nav>
        <Link href="/produktblad" className={!example ? "selected" : ""} onClick={event => { if (!canLeave()) event.preventDefault(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l4 4v16H6zM14 2v5h4M9 11h6M9 15h6M9 18h4" /></svg>Bibliotek</Link>
        <Link href="/?exempel=1" className={example ? "selected" : ""} title="Öppna Mall 01 med exempeldata" onClick={event => { if (!canLeave()) event.preventDefault(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2h10l4 4v16H5zM8 9h8M8 13h3v5H8zM14 13h2M14 17h2" /></svg>Mallar</Link>
        <button type="button" onClick={() => dialog.current?.showModal()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3 1-2h4l1 2 3 2 2 1-1 4 1 4-2 1-3 2-1 3h-4l-1-3-3-2-2-1 1-4-1-4 2-1z" /><circle cx="12" cy="10" r="3" /></svg>Inställningar</button>
      </nav>
      <span className="sidebar-local" title="Utkast sparas i den här webbläsaren">Lokalt</span>
    </aside>
    <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-title">
      <h2 id="settings-title">Din arbetsyta</h2><p>Utkast sparas på den här datorn, i den här webbläsaren. Använd Spara utkast eller Ctrl+S / ⌘S.</p><p>Mall 01 har en fast A4-layout. Standardtexter återställs med pilen vid respektive fält. Hela bladet kan återställas under Om mallen & fler alternativ i redigeraren.</p><form method="dialog"><button className="dialog-close">Stäng</button></form>
    </dialog>
  </>;
}
