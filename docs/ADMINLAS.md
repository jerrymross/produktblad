# Lås för färdiga produktblad

Uppdatering 19 oktober 2026: alla användare med skolåtkomst kan låsa ett sparat blad, även om någon annan skapade det. Endast admin får låsa upp, fortsatt med bekräftelse. Migration `009-editor-finalization.sql` ändrar funktionen i databasen; samma krav på aktuell revision, statusversion och egen aktiv redigeringssession gäller. Befintliga lås och historik bevaras. Gränssnittet visar **Låst**, med namn och tid i statusens tooltip/historik.

Aktivering: `npx.cmd tsx scripts/migrate-editor-finalization.ts dev <ägar-env>` och därefter `prod`. Kör endast efter driftinstruktion. Migrationen förutsätter 008. Verifiering: `node scripts/test-editor-finalization.mjs` testar riktiga API-handlers/PostgreSQL/RLS för användarlåsning, annan skapare, skolisolering, fel session, versionskonflikt och adminupplåsning. `node scripts/test-editor-finalization-ui.mjs` testar den riktiga redigeraren i Chrome med simulerade API-svar och förutsätter det första testets bundle. A4/PDF-renderingen ändras inte.

Migration 009 är aktiverad i `studio_dev` och `studio` den 19 oktober 2026. Lokala API-/RLS-prov, Chrome-prov, typkontroll och bygge passerade. Funktionens skolkontroll, upplåsningsregel och fixerade search_path kontrollerades i faktisk databas. Inga befintliga blad låstes vid aktiveringen. Inloggad produktionsbrowser och PDF-export har inte återtestats.

Nedan beskrivs den ursprungliga leveransen och dess verifiering.

Beställt 12 oktober 2026: admin kan låsa ett färdigt produktblad och låsa upp med ett separat bekräftelsesteg utan PIN. Låset gäller det enskilda bladets innehåll, inte den gemensamma A4-mallen eller andra skolors blad. Ingen publicering, faktagranskning eller automatisk sändning ingår.

## Användning

1. Admin öppnar bladet och sparar alla ändringar. Bladet måste ha en sparad version och admin måste äga dess aktiva redigeringssession.
2. Klicka **Lås färdigt produktblad** i redigeraren. Den sparade versionen låses; innehållsfälten och återställning från historik kan inte ändras. Pågående redigeringssession frigörs.
3. Biblioteket visar **Låst av admin** och **Visa produktblad**. Alla som redan har skolåtkomst kan läsa bladet och exportera dess sparade version till PDF. PDF-knappen sparar inte en ny version när bladet är låst.
4. Bara admin ser **Lås upp …**. Den öppnar en dialog med **Avbryt** och **Bekräfta upplåsning**. Avbryt/Escape gör ingen ändring. Ingen PIN eller nytt lösenord används.
5. Efter bekräftelse öppnas redigering igen. Låsning och upplåsning registreras separat med användare, databastid och bladrevision i versionshistoriken. Innehållshistorik och tidigare exporter ändras inte.

Om någon låser ett blad medan en annan flik har osparade ändringar stoppar servern sparningen. Fliken bevarar innehållet och visar låsstatus efter nästa statuskontroll (var 30:e sekund eller vid fokus). Om fliken saknar lokala ändringar visas den låsta sparade versionen. Efter en extern upplåsning används **Försök öppna för redigering igen**; en äldre lokal revision får inte skriva över en nyare serverversion.

## Databas och aktivering

`migrations/002-sheet-finalization.sql` lägger till två separata objekt: `sheet_finalizations` för aktuell status och `sheet_finalization_events` för oföränderlig händelsehistorik. Tabellen för bladens innehåll utökas inte. RLS begränsar läsning till redan behöriga skolor. Runtime-rollen har bara SELECT på låstabellerna; låsstatus kan ändras genom `set_sheet_finalization`, som kontrollerar skyddad adminroll, aktuell bladrevision, låsstatusversion och giltig redigeringssession vid låsning. Upplåsning kräver uttrycklig bekräftelse. Funktionerna har fixerad search_path med pg_temp sist.

Låsändring, händelsehistorik och sparning serialiseras på samma bladrad. Triggers stoppar även direkta UPDATE på låsta blad, nya innehållsversioner och ny/förnyad redigeringssession. Bladkopplad bilduppladdning kontrollerar samma lås innan media skapas. Originalets skolbehörigheter och centrala roller används; klienten kan inte ge sig själv admin.

Migration 002 aktiverades efter användarens uttryckliga tillstånd den 12 oktober 2026, först i Neon DEV (studio_dev) och sedan produktion (studio). Båda miljöerna verifierades med sina begränsade runtime-roller. I andra miljöer utan migrationen döljs gränssnittet och ordinarie redigering/export fortsätter; lås-API svarar då 503.

Vid framtida installation, efter tillstånd, från projektroten med befintlig ignorerad `.env.owner`:

```powershell
npx.cmd tsx scripts/migrate-finalization.ts dev
npx.cmd tsx scripts/migrate-finalization.ts prod
```

En befintlig ägarfil på annan plats kan anges som ett tredje argument efter dev/prod; den behöver inte kopieras till projektmappen. Kör bara den uttryckligen valda miljön. Skriptet verifierar mål-schema, använder transaktion och migrationslås, journalför version 002 och ger den befintliga runtime-rollen SELECT samt EXECUTE på låsfunktionen. Det skapar inga molnresurser och skriver inga hemligheter. Återkörning är säker. `scripts/provision.ts` inkluderar även 002 vid framtida installationer.

## Verifiering 12 oktober 2026

- Statiskt: typkontroll och lint passerade. Production build passerade med en avsiktligt oanvändbar lokal testanslutning och tillfällig testhemlighet. Better Auths varning om den oåtkomliga testdatabasen var förväntad; build verifierar inte drift.
- Isolerad databas/API: `node scripts/test-finalization.mjs` använder PGlite 0.5.8 i separat temporärt QA-utrymme och verkliga 001/002-migrationer, begränsad NOBYPASSRLS-roll samt riktiga routehandlers. Autentiseringsgränsen är simulerad. Prov: admin/icke-admin/anonym, fel origin, gammal innehållsrevision/låsstatus, ogiltig session, bekräftelsekrav, låsta sparningar och låsoperationer, direkta SQL-skrivningar, skolgräns för status/logg, återupplåsning, sparning därefter, oförändrad tidigare revision och återkallad adminroll. Detta är ett serialiserat isolerat prov, inte ett lastprov med flera Neon-anslutningar.
- Lokal browser: riktiga Editor/Catalog-komponenter med simulerade API-svar. Låsning, dialog utan PIN, Avbryt/Escape/bekräftelse, ingen sparning vid låst PDF-export, spärr vid osparat innehåll, låsstatus i biblioteket, dold upplåsning för redaktör, externa lås med bevarade lokala ändringar samt fallback före migration. Desktop och 390 px mobil visuellt granskade. QA-bilder och browserharness finns i `work/finalized-*.png`, `work/unlock-*.png` och `work/test-finalization-browser.mjs`.
- Lokal exporterad PDF: A4-renderare och PDF-route är oförändrade. Browserprovet verifierade den låsta exportens request och avsaknad av PUT, med en befintlig PDF-fixture som svar. Ingen ny autentiserad PDF-export på verklig databas har verifierats i denna uppdatering.
- Vercel/Neon/RLS: ingen live-migration, deployment eller inloggad kontroll utförd. Faktisk aktivering och end-to-end-prov i den beställda miljön återstår efter tillstånd.

Återskapa det isolerade databasprovet:

```powershell
npm.cmd install --prefix "$env:TEMP/produktblad-admin-qa" --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.8
node scripts/test-finalization.mjs
```

QA-databasen finns bara i minnet. Inga riktiga användare, blad eller Neon-data ändras av testet.

## Faktisk Neon-aktivering 12 oktober 2026

- Användaren gav uttryckligen tillstånd att aktivera i Neon efter den lokala leveransen. Migration 002 kördes i studio_dev, verifierades, och kördes därefter i studio. Ingen ny molnresurs eller manuell Vercel-deployment skapades.
- Både studio_dev_app och studio_app verifierade: rätt schema, NOBYPASSRLS, RLS på båda låstabeller, SELECT utan skrivprivilegier, EXECUTE på låsfunktionen, tre aktiva triggers, migrationspost 002 och fixerad search_path.
- Ett tillfälligt blad skapades i en transaktion per miljö med en befintlig adminidentitet. Verklig SQL verifierade låsning, nekad ändring av låst blad, nekad upplåsning utan bekräftelse, nekad direkt statusändring, nekad upplåsning från icke-admin samt skolisolering av status. Bekräftad upplåsning gav två korrekta historikhändelser och tillät innehållsändring igen. Hela transaktionen rullades tillbaka, inklusive testblad, session och händelser. Inga bestående testdata skapades.
- Befintliga blad- och versionsantal var oförändrade efter provet. Ingen användare, roll eller skolmedlemskap ändrades. Inga befintliga blad låstes automatiskt.
- Lokal QA: work/preflight-finalization.mjs och work/verify-neon-finalization.mjs. Dessa läser befintliga ignorerade anslutningsfiler utan att skriva eller visa hemligheter.
- Vercel: denna aktivering är verifierad direkt i faktisk Neon-databas. Ett inloggat browserflöde genom Vercel och en verklig Vercel-PDF-export har inte återtestats i aktiveringsturen. Tidigare lokala browser- och API-prov beskrivs ovan.
## Lås och kopior i toppbaren 12 oktober 2026

Lås-/upplåsningsknappen och Skapa kopia finns nu bredvid bladets spar-/låsstatus i toppbaren. Knappen visar kopieräknaren (0/2–2/2); befintliga kopior nås genom menyn Kopior. Den stora statusrutan i vänstra redigeraren är borttagen. Uppgift om vem som låste och när finns i statusens tooltip och i historiken. Mobila skärmar delar toppbaren i rader för rubrik, status/lås/kopior och sparning/export. Behörigheter, bekräftelsedialog, databasregler och max två kopior är oförändrade.
