# Nya produktblad och adminöversikt

Beställt 19 oktober 2026: en menypunkt för att lägga till egna produktblad och en adminflik för att följa vilka blad användarna skapar.

## Arbetsflöde

**Nytt produktblad** (`/new`) låter användaren ange utbildningens namn (1–150 tecken), utbildningsform **Komvux**, **AF** eller **AF RUB**, och en befintlig skola som användaren har åtkomst till. Admin kan välja alla vanliga skolor. Ett blad hör till en skola; skapa separata blad för flera skolor. Ytterligare utbildningsformer kräver ett separat beslut om mall och standardinnehåll.

**Skapa och öppna produktblad** skapar posten och öppnar den befintliga redigeraren. Bladet syns direkt i skolans bibliotek även vid revision 0. Innehållet sparas därefter med **Spara utkast**. Samma redigeringslås, historik, adminlås, kopior, medieåtkomst och PDF-renderare används. Namnet i biblioteket är namnet från skapandet; redigering av omslagsrubriken ändrar inte bibliotekets metadata.

För ett utbildningsnamn utan förinställd bild används den befintliga exempelbilden. Bildväljaren erbjuder övriga utbildningars bilder och direktuppladdning enligt befintliga regler. Standardtexter är redigerbart underlag med platshållare, inte verifierade utbildningsfakta.

Under **Administration → Tillagda produktblad** (`/admin/added`) ser admin nytillagda originalblad, senast först: namn, utbildningsform, skola, skapare, skapandedatum och sparstatus. Sökning omfattar namn, utbildningsform, skola och skapare; skolfilter finns. Kopior och ändringar i den fasta katalogen ligger kvar i sina befintliga vyer. Ingen godkännandeprocess eller automatisk avisering har införts.

## Lagring och säkerhet

- Migration `007-added-sheets.sql` lägger till `added_sheets`, separat från bladets innehåll och historik. Den fasta katalogens ID:n ändras inte.
- `new:<uuid>` identifierar ett nytt original. Servern slår upp skol-/programmetadata med aktuell användares RLS; metadata hämtas inte ur klientens innehåll.
- `create_added_sheet` kontrollerar aktuell skolåtkomst och tillåtna val, registrerar skapare från `current_app_user()` och datum från databasen, samt skapar metadata och blad atomiskt. Samma request-ID återanvänds vid nätverksfel; upprepning med identiska uppgifter ger samma blad.
- Runtime-rollen får läsa men inte skriva metadata direkt. Restriktiva policyer stoppar direkt skapande av `new:`-blad och byte av skola/titel på befintliga nya blad. Befintliga lås- och sparregler gäller innehållet.
- `/api/admin/added-sheets` kräver aktuell centralroll på servern. Vanliga användares bibliotek filtreras med databasens skolåtkomst.
- Utan migrationen fortsätter befintliga katalogblad fungera. Formuläret visar att funktionen inte aktiverats och POST ger 503. Ingen tyst lokal lagring används.

Säkrad `search_path` och begränsad EXECUTE-rätt följer [PostgreSQLs instruktioner för SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY).

## Aktivering – separat beställning krävs

Ingen live-migration eller manuell deployment har utförts i denna uppdatering. När aktivering beställs: kör och verifiera först i DEV, därefter i produktion. Befintliga resurser används.

```powershell
npx tsx scripts/migrate-added-sheets.ts dev .env.owner
# Efter verifierat DEV och uttrycklig produktionsinstruktion:
npx tsx scripts/migrate-added-sheets.ts prod .env.owner
```

Skriptet kräver rätt existerande schema och migration 003, låser migrationshistoriken, installerar 007 en gång och tilldelar endast behövliga rättigheter. Det skapar inga molnresurser. Ägaranslutningen läses bara på servern/terminalen och får inte exponeras i browsern.

## Verifiering

- TypeScript, riktad ESLint och Next.js-build: godkända. `work/` undantas nu från TypeScript eftersom mappen innehåller historiska arbetskopior med gamla API-signaturer.
- `node scripts/test-added-sheets.mjs`: riktiga route handlers och migrationer i isolerad PGlite/Postgres med begränsad runtime-roll. Kontrollerar formulärval, ursprung, anonym åtkomst, skapande/sparning/återöppning, historik, skolisolering, dubbla återförsök, adminlista, metadataförfalskning, återkallat medlemskap, förmigration och kopior av nya låsta original.
- `node scripts/test-copies.mjs`: befintliga kopior, lås, skolåtkomst och versionskontroller passerar efter uppslagsändringen.
- `node scripts/test-added-sheets-ui.mjs`: verkliga React-komponenter i lokal Chrome med simulerade API-svar/router. Formulär, menylänk, mobilbredd, misslyckat skapande/återförsök, navigeringsmål, nya biblioteksposter, adminsökning och skaparnamn passerar. Skärmbilder granskade i `work/added-sheets/`. Portalens externa v3-stilmall och inloggning ingår inte i detta isolerade prov.
- `node scripts/test-added-sheets-pdf.mjs`: använder sparade versionssnapshotar från databastestet och den riktiga `Sheet`-komponenten. Alla tre utbildningsformer ger en A4, läsbar text, inbäddade fonter och inga overflow-fält. PDF:erna renderades till PNG och granskades mot referensen. Befintliga skillnader i mallar, exempelbild och standardtext kvarstår; A4-mallarnas CSS har inte ändrats. Detta är lokal rendering, inte ett autentiserat anrop till produktions-PDF-routen.
- Faktisk Vercel/Neon: nya funktionen har inte aktiverats eller verifierats live. Ingen Supabase används.

Testberoenden för PDF-inspektion installeras separat, utan ändring av appens beroenden:

```powershell
npm install --prefix work/pdf-qa --no-save --package-lock=false pdfjs-dist@6.4.299 @napi-rs/canvas@1.0.11
```

Databastestet återanvänder den befintliga isolerade PGlite-installationen under `%TEMP%/produktblad-admin-qa`. Browserproven använder Chrome eller `PDF_BROWSER_PATH`.
