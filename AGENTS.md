# Instruktioner för Codex

## Uppdrag och läsordning

Detta är ett startpaket för en svensk produktbladsapp. Läs README.md, docs/PROJEKTSPECIFIKATION.md, docs/DESIGNREGLER.md och docs/BYGGPLAN.md innan implementation. Implementera bara det steg användaren beställer. Den första färdiga uppgiften i README avser endast steg 1.

Använd svenska i gränssnitt, instruktioner, felmeddelanden och leveransrapporter. Kodidentifierare kan vara engelska. Spara svensk text i UTF-8. Uppdatera dokumentationen när implementationen ändrar en teknisk detalj; gör inte öppna frågor till godkända produktbeslut.

## Fast produktform

- Varje blad är exakt en stående A4. Ingen fri designredigering för skolredaktörer.
- Mallversionen bestämmer font, storlek, radavstånd, mellanrum, marginaler, färg och placering. Redigeraren ändrar separata innehållsfält.
- Innehåll, mallversion, mediereferenser och export-PDF är separata objekt.
- Preview och export använder samma renderingsmodell och samma frysta innehållsversion.
- Skola är åtkomstnivå; flera medlemskap per användare. Centrala administratörer har åtkomst till alla skolor och gemensamma mallar.
- Använd inte utbildningstext i referensen som bevis för aktuella utbildningsfakta.

## Referens och resurser

references/Kock.pdf är en oföränderlig layoutreferens. Redigera eller ersätt den aldrig. Mät originalets geometri; gissa inte exakta mått från fontnamn eller beskrivning. Originalbilder, kompletta fontfiler och deras användningsrätt behöver fastställas. Markera ersättningsbilder och typsnitt som prototypavvikelser. Automatisk import av godtyckliga Illustrator-PDF:er ligger utanför MVP.

## Teknisk riktning

Godkänt: Next.js, TypeScript, Vercel, Supabase Postgres/Auth/Storage. Rekommendation: App Router, återanvändbar mallrenderare, lokala exempeldata i steg 1 och Node.js för framtida PDF-route. Kontrollera aktuella officiella dokument innan versionsberoende implementation. Spara exakta valda beroendeversioner och lockfil. Paketinstallation ingår först när ett implementationssteg beställs.

Bevara dessa dokument vid scaffolding. Projektroten är den öppnade mappen med README och AGENTS.md; skapa inte oavsiktligt ett andra utvecklingsprojekt i en undermapp. Anpassa framtida struktur efter behov utan att blanda redigerardata och exportfiler.

## Behörigheter och samtidighet från steg 2

Implementera skolåtkomst i databasens RLS, Storage-regler och serveroperationer. UI-filtrering räcker inte. Hämta medlemskap/central roll från skyddade databastabeller; använd inte användarredigerbara metadata för auktorisering. Ingen klient ska kunna ge sig själv central roll eller skolmedlemskap. Validera även byte av school_id och mediereferenser.

Serverhemligheter och privilegierade Supabase-nycklar får aldrig ligga i frontend eller NEXT_PUBLIC_-variabler. Privilegierade serverklienter kringgår RLS och kräver egna verifierade åtkomstkontroller. Använd privata lagringsytor och auktoriserad åtkomst till filer. Återanvänd inte signerade länkar som varaktiga bildreferenser.

Databaslås ska tas atomiskt. Lås, behörighet, databastid och förväntad bladversion ska kontrolleras i samma transaktion som sparning och historik. Förhindra att klienten går runt sparfunktionen genom direkt tabellskrivning. Förlorat lås ska stoppa skrivning och bevara lokalt osparat innehåll. Ett andra fönster av samma användare är en annan redigeringssession. Samtidig redigering är en senare separat design.

## Arbetsgränser

Skapa inga Vercel-/Supabase-resurser, koppla inte molnkonton och publicera inte utan uttrycklig användarinstruktion. DEV och produktion ska vara separerade när molnsteg beställs. Gör inga liveändringar utan användarens instruktion. Skicka inga automatiska meddelanden. Godkännandeflöde och egna skoluppladdningar väntar på beslut.

## Verifiering och leverans

Efter varje färdig och verifierad uppdatering: committa projektändringarna och pusha till `origin/main`, enligt användarens instruktion den 8 oktober 2026. Detta ger inte tillstånd att skapa molnresurser eller publicera till Vercel/produktion.

Följ acceptanskriterierna i BYGGPLAN.md. Testa verkliga användarflöden och riskerna i ändringen. För visuella steg: granska preview i browser, rendera export-PDF och jämför med referensen; kontrollera sidantal, A4, typsnitt och geometrin. En lyckad build bevisar inte visuell överensstämmelse.

Rapportera separat: statiska kontroller, lokal browser, lokal exporterad PDF, faktisk Vercel-miljö och Supabase/RLS. Säg inte att något fungerar i Vercel efter enbart lokala prov. Dokumentera saknade resurser och kvarvarande avvikelser. Utöka inte uppdraget till nästa steg utan användarens instruktion.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
