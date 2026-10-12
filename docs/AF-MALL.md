# AF-mall enligt Rityta 1.pdf

Beställd 12 oktober 2026: annat textupplägg för alla AF-produktblad. Implementerat för katalogprogrammen AF och AF RUB, totalt 32 blad. Övriga program behåller befintlig mall.

## Referens och innehåll

`references/AF.pdf` är en oförändrad kopia av användarens `Rityta 1.pdf`. SHA-256: `F15004B8045DB6C5A1271AFB0CFBA9D7272A2D6ED3D2E24DBB8DB789EDB9FA11`. Originalets A4 är 595,276 × 841,890 pt. `references/Kock.pdf` är oförändrad.

Referensen används för avsnittens ordning, textstorlek, spaltplacering, kontaktblock och sidfot. Omslagets befintliga bild-, rubrik-, färg- och gradientfunktioner behålls. Referensens bild och slogans blir inte standardinnehåll. Efter användarens följdbeställning 12 oktober används den allmänna PDF-texten som standard för orörda AF/AF RUB-blad. Yrke, arbetsuppgifter, utbildningsområde, ort, studieform, omfattning, poäng, längd, APL och kontaktuppgifter ersätts med `****`. Innehållet är användarbeställd malltext, inte en faktagranskning av utbildningar.

## Uppmätta huvudpositioner

Koordinater i pt från sidans övre vänstra hörn. Textpositioner avser PDF-glyfer; CSS-boxars överkant ligger något högre.

| Del | Referens | Mall |
| --- | --- | --- |
| Vänsterspalt, x | 58,755 | 58,755 |
| Högerspalt, x | 315,458 | 315,458 |
| Första rubrik, y | 322,179 | 321,66 i lokalt PDF-prov |
| Brödtext | Inter18pt-Light, 9 pt, cirka 12 pt radavstånd | Befintlig Inter Light, 9/12 pt |
| Avsnittsrubrik | Inter18pt-Bold, 11 pt | Befintlig Inter Bold, 11/12,32 pt |
| Kontakternas linje, y | 644,667 | 644,667 |
| Kontaktpersoner, x/y | 315,856 / 664,02 | 315,458 / 664,42 i lokalt prov |
| Om Astar, övre linje, y | 735,101 | 735,101 |
| Om Astar, linjens x-intervall | 46,759–550,100 | 46,759–550,100 |

AF har vänsterspalt 228 pt, högerspalt 243,13 pt och spaltavstånd 28,703 pt. Referensens högerspaltstext når cirka x=557,38, något längre åt höger än kontaktlinjen. Kontakterna har en fast yta ovanför Om Astar. En ifylld kontakt får hela bredden; två kontakter delar ytan. Namn visas om de är ifyllda. Rollen visas i fet stil, följd av namn och e-post. Tomma namn skapar ingen extra rad.

Om Astar har en gemensam bred yta med linjer. Logotyp och QR-kod centreras under denna, skolnamn och adress visas under logotypen. Layouten är fast och text krymps inte automatiskt vid overflow.

### Kvarvarande prototypavvikelser

Referensens kompletta originalfonter och deras användningsrätt är inte fastställda. Appens befintliga lokala Inter/Lora används fortsatt. AF-brödtextens fasta teckenavstånd är −0,16 pt för dessa fontfiler. Faktalabels använder befintlig Bold i stället för referensens SemiBold. Radbrytning kan därför skilja något. Logotypens Education-tillägg och QR-kodens utförande kommer från befintliga appresurser. Omslaget har inte gjorts om för att kopiera referensens slogan. Detta är ett textupplägg enligt referensen, inte ett löfte om identisk återgivning av alla originalresurser.

## Modell, sparning och historik

`SheetData` har bakåtkompatibla valfria fält `layout`, `startTitle`, `start` och `schoolName`. Nya AF-blad får `AF_DEFAULT_CONTENT` från `lib/af-default-content.ts`, inklusive PDF-textens utbildningsstart och faktarader med `****`. Utbildningsfakta använder befintliga `form`/`formTitle`; ingen befintlig text raderas eller omtolkas till gissade sakuppgifter. Endast kända labelprefix i början av en rad visas i fet stil; HTML från användaren körs inte.

`ensureSheet` använder fortsatt INSERT ON CONFLICT DO NOTHING. Nya poster får standardtexten direkt. Efter ytterligare följdbeställning kompletterar `readSheet` nu tomma fält på osparade AF/AF RUB-blad (revision 0) med `withUnsavedAfDefaults` vid varje öppning. Befintlig text bevaras. Databasposten skrivs inte om vid läsning. Sparade versioner och uttryckligt vald historik kompletteras inte. Redigeraren använder samma komplettering för äldre lokala utkast vid revision 0 så att deras tomma fält inte tar bort standardtexten. Ingen live-bulkändring eller datamigration utförs. Ett uttryckligt val av Återställ standardinnehåll använder hela standardtexten.

`withProgramLayout` väljer mall utifrån katalogprogram. Standardrubriker anpassas första gången AF-mallen används; egna rubriker bevaras. `schoolName` hämtas från katalogen på servern. Ändrad övre etikett byter inte mall. Servern normaliserar mallval före sparning och lagrar samma mallversion i `sheets` och `sheet_versions` i befintlig transaktion med lås, revisionskontroll och historik.

Nuvarande AF-innehåll anpassas i redigeraren. Spara skapar en ny fryst AF-version. `readSheet(..., revision)` ändrar inte historiskt innehåll. En gammal version utan `layout` använder fortfarande standardmallen i renderaren. Återläst historik i redigeraren anpassas till dagens tilldelade mall innan en ny version sparas. Gamla lokala AF-utkast med standardmallens nyckel kan fortfarande importeras; reset-markeringar respekteras.

`Sheet`, `app/sheet.css` och `measureSheetOverflow` delas av preview och export. Kontrollerna fångar överfulla spalter, rubriker, långa obrutna ord, kontakter som når Om Astar och sidfot som når utanför A4. Befintlig exportspärr gäller; utkast kan sparas med för mycket text.

## Verifierat lokalt 12 oktober 2026

- Statiskt: lint, TypeScript och Next-produktionsbuild. Build använde en avsiktligt oåtkomlig lokal databasadress, med väntad Better Auth-varning; den testar inte en riktig databasanslutning.
- Modelltest: alla 136 katalogposter, varav 32 AF/AF RUB, valideras. Gamla snapshots, manuella adresser, egna rubriker, nya startfält och import/reset av äldre lokala utkast kontrollerades. Kör `npx tsx scripts/test-af-layout.ts`.
- Lokal browser: faktisk Editor och Sheet i isolerad harness med simulerade API-svar. AF/AF RUB väljer AF, Komvux standard. Befintlig text bevaras, start redigeras och ingår i sparpayload. Desktop och mobil 390 px granskades. Lång start och långa kontakter ger overflow. Inga browserfel.
- Lokal databas: faktiska PUT/readSheet-operationer mot isolerad PGlite med projektets ursprungliga schema och RLS. Servern korrigerar klientens felaktiga mallval; skolnamn, start och innehåll sparas med AF-mallversion. Historisk standardversion förblir oförändrad. Fel skolåtkomst, förlorat lås, gammal revision och ogiltigt startfält avvisas.
- Lokal PDF: samma Sheet-renderare med fryst testinnehåll, väntade fonter och laddade bilder. AF-referensens text ryms utan overflow. Poppler-renderad PDF granskades visuellt; en stående A4, 594,960 × 841,920 pt, inbäddade Inter/Lora och sökbar svensk text. Måtten ligger inom ±0,2 mm av A4.
- Komvux-regression: samtliga 2 351 teckens text, fontstorlek och positioner är identiska med tidigare lokal standardexport, avrundat till 0,01 pt.
- Faktisk Vercel/Neon: inte verifierat och ingen manuell publicering eller live-dataändring utförd i detta arbete. Ingen Supabase-anslutning ingår.

Testfiler, browserbilder och provexporter finns lokalt i den ignorerade katalogen `work/`. Referenstext i dessa prov är en QA-fixture, inte produktinnehåll.

Följdbeställningens standardtexter har också provats lokalt: nya databasposter får text och `****`, befintliga poster vid revision 0 bevaras vid upprepad öppning, sparade revisioner och historik bevaras. Standardtexten renderades i browser och exporterades till en stående A4 utan overflow; PDF-bilden granskades visuellt. Inga liveposter uppdaterades.

Kompletteringen vid återöppning verifierades också med faktiska readSheet-operationer i isolerad Postgres: revision 0 med tom lärtext/start får standardtext, redan ifylld inledning bevaras, upprepad läsning ger samma innehåll och databasposten är oförändrad. Modelltestet kontrollerar att sparade blad och Komvux inte kompletteras. Browserprovet kontrollerar att ett äldre lokalt AF-utkast får text i tomma fält och att texten finns kvar efter omladdning, medan den egna inledningen bevaras.
