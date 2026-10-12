# Redigerbara kopior av låsta blad

Beställt 12 oktober 2026. Användaren förtydligade att **alla skolredaktörer**, inklusive verksamhetschefer, får skapa kopior. Ingen ny roll införs. Behörigheten gäller den egna skolans blad; central admin behåller åtkomst till alla skolor.

## Användning

Öppna ett låst originalblad och klicka **Skapa redigerbar kopia**. Kopian öppnas direkt för redigering. Originalet förblir låst och oförändrat. Kopian märks **Kopia 1** eller **Kopia 2** och har länk tillbaka till originalet. Du kan spara, återöppna, läsa dess egen historik och exportera PDF. PDF-filnamnet innehåller kopians nummer. Admin kan även låsa kopian med den befintliga låsfunktionen.

Två kopior totalt får skapas per originalblad, gemensamt för alla behöriga användare. Gränsen gäller över originalets versioner och upplåsningar. När två kopior finns inaktiveras knappen och befintliga kopior länkas för fortsatt redigering. Kopior kan inte skapa ytterligare kopior. Ingen radering eller återställning av kopiekvoten ingår. Bibliotekets originalkort länkar till sina kopior; bibliotekets grundantal skolor/utbildningar förändras inte.

## Teknik och säkerhet

Migration 003 lägger till `sheet_copies` med ursprungsblad, fryst ursprungsrevision, nummer, skapare och databastid. Kopian får eget sheets-ID, egen revision 1 och egen sheet_versions-post. Innehåll och mallversion kopieras exakt från det låsta originalet. Privata bildreferenser behålls inom samma skola; oföränderliga medier kan delas mellan original och kopior. Mallen och A4-renderaren ändras inte.

`create_sheet_copy` kontrollerar skyddad skolåtkomst, låst original, ursprungsrevision och max två kopior i samma transaktion. Funktionen låser originalets bladrad med FOR UPDATE och har ett unikt constraint på original/nummer. Runtime-rollen får SELECT på kopieregistret samt EXECUTE på funktionen, men inga skrivprivilegier i registret. En restriktiv INSERT-policy stoppar direkt tillverkning av copy-ID:n i sheets. Den kontrollerade SECURITY DEFINER-funktionen skapar kopior med fixerad search_path.

Serverns ID-upplösning tillåter bara kopia 1/2 av ett känt katalogoriginal. Redigering av en kopia kräver att den redan finns; klienten kan inte skapa den genom vanlig sparning eller ändra dess skola/ursprung. Vanlig skol-RLS, versionskontroll och sessionlås används vid fortsatt arbete. Gemensamma exempelblad är inte skoloriginal och kopieras inte genom denna funktion.

Funktionen döljs före migration 003 i andra miljöer. Migrationsskriptet kan köras efter uttryckligt tillstånd:

```powershell
npx.cmd tsx scripts/migrate-copies.ts dev
npx.cmd tsx scripts/migrate-copies.ts prod
```

En tredje parameter kan ange befintlig ägarfil på annan plats. Inga hemligheter skrivs eller visas. Provisioneringsskriptet inkluderar 003 vid framtida installationer.

## Verifiering och faktisk aktivering

- Statiskt: typkontroll och lint passerade. Build passerade med oanvändbar lokal testanslutning och tillfällig testhemlighet; Better Auths varning om oåtkomlig testdatabas var förväntad.
- Isolerad SQL/RLS/API: `node scripts/test-copies.mjs` kör verkliga migrationer och routehandlers med PGlite och begränsad databasroll. Autentiseringsgränsen simuleras. Skolredaktör skapar kopia 1/2; tredje, direkt INSERT, kopia av kopia, fel ursprungsrevision och annan skolas åtkomst nekas. Kopians innehåll startar exakt från originalets snapshot, kan sparas med egen historia och ändrar inte originalets innehåll/lås. Vanliga adminlåsprov ingår även som regression.
- Lokal browser: riktiga Editor/Catalog med simulerade API-svar. Skolredaktör skapar kopior, öppnar rätt kopia, ändrar/sparar, återöppnar original och kopior, når tvåkopiegränsen samt använder bibliotekslänkar. PDF-request pekar på kopians ID och sparade revision. Desktop och 390 px mobil visuellt granskade. QA: work/test-copies-browser.mjs samt copies-*.png/copy-editor-*.png.
- Lokal PDF: A4-renderare och export-route är oförändrade. Browserprovet använder en befintlig PDF-fixture som exportsvar; det verifierar requestens kopie-ID/revision, inte en ny autentiserad exportfil. Ingen ny PDF-layout eller referensändring ingår.
- Faktisk Neon: migration 003 aktiverad först i studio_dev och sedan studio med det befintliga tillståndet att aktivera funktionen i Neon. Prov med riktiga runtime-anslutningar och befintliga skolmedlemskap verifierade att en icke-admin kan skapa två kopior; tredje och direkt INSERT nekas. Kopior har egen historik och kan ändras, originalet är oförändrat/låst, kopiekedjor och oåtkomlig skola nekas. Allt testinnehåll skapades i transaktioner som rullades tillbaka. Antal befintliga blad och versioner var oförändrade. Inga användare, roller eller medlemskap ändrades. QA: work/verify-neon-copies.mjs.
- Vercel: ingen manuell deployment och inget nytt autentiserat live-browser-/PDF-prov. Lokal browser och faktisk Neon-verifiering rapporteras separat.

Det isolerade databasprovet använder samma temporära PGlite-installation som tidigare adminprov, utan nya appberoenden:

```powershell
npm.cmd install --prefix "$env:TEMP/produktblad-admin-qa" --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.8
node scripts/test-copies.mjs
```

Placering uppdaterad 12 oktober 2026: Skapa kopia och kopieräknare finns i toppbaren bredvid Låst av admin. Befintliga kopior öppnas från menyn Kopior i toppbaren eller från bibliotekets originalkort.
