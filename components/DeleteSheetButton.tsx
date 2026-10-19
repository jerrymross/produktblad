"use client";
import { useRef, useState } from "react";
import { cloud, jsonRequest } from "@/lib/cloud-client";
import { sheetApiPath } from "@/lib/sheet-id";

export function DeleteSheetButton({ id, title, school, revision, disabled = false, onDeleted }: {
  id: string; title: string; school: string; revision: number; disabled?: boolean; onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function remove() {
    if (pending.current || disabled) return;
    const copies = id.startsWith("copy:") ? "" : " Eventuella kopior följer med originalet.";
    if (!window.confirm(`Ta bort ”${title}” (${school})?\n\nBladet flyttas till skräpkorgen.${copies} En administratör kan återställa det.`)) return;
    pending.current = true; setBusy(true); setError("");
    try {
      await cloud(`${sheetApiPath(id)}/trash`, jsonRequest("POST", { revision, confirmed: true }));
      onDeleted();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Bladet kunde inte tas bort."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div><button type="button" className="text-button" disabled={disabled || busy} onClick={() => void remove()}>{busy ? "Flyttar till skräpkorgen …" : "Ta bort blad"}</button>{error && <p role="alert">{error}</p>}</div>;
}
