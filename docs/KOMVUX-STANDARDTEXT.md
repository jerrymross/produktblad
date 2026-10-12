# Komvux-standardtext med ***

Beställd 12 oktober 2026 enligt användarens `produktblad-kock-exempel (11).pdf`, bevarad som `references/Komvux-text.pdf`. Den befintliga Komvux-layouten används; ingen ny mallversion eller layoutändring införs.

`lib/komvux-default-content.ts` innehåller den anpassade standardtexten. Yrke, ingressens yrkesområde, arbetsuppgifter, yrkeskunskaper, praktikandel, studieform, veckor, omfattning, procent, poäng och kontaktuppgifter ersätts med `***`. Målgrupp, ekonomi och Om Astar behåller användarens generella referenstext. Skolans redan fastställda adress och QR-adress hämtas fortsatt från katalogens skoluppgifter, inte från PDF-exemplets Umeå-adress. Exempelbladet Kock behåller sina ursprungliga exempeltexter.

Nya Komvuxblad får hela standardtexten i initialSheet. `withUnsavedProgramDefaults` kompletterar tomma fält på osparade Komvuxblad (revision 0), även vid återöppning och import av äldre lokala utkast. Egna texter och kontaktuppgifter bevaras. På revision 0 ersätts också exakt matchande äldre standardtext i `process` och `form`, så att förinställda 15 %, 50 veckor och 1 200 poäng inte följer med som generella utbildningsfakta. Annan text i dessa fält bevaras.

Sparade blad (revision > 0), frysta historiska versioner och Kock-exempelbladet kompletteras inte. Läsningen skriver inte över databasposten. Spara skapar en ny version via befintligt lås- och versionsflöde. Återställ standardinnehåll och fältets återställningsknapp använder den nya standardtexten när redaktören själv väljer det. AF behåller sin egen standardtext och fyra asterisker.

## Lokal verifiering

- `scripts/test-komvux-defaults.ts`: alla Komvuxposter, tre asterisker, validering, egna fält, gamla standardvärden, idempotent återöppning, sparade blad och oförändrat exempelblad. AF-modelltestet passerar också.
- Faktiska readSheet/PUT-operationer i isolerad PGlite med projektets schema/RLS: tomma Komvuxfält kompletteras, egna texter bevaras, gamla standardvärden ersätts i svaret, upprepad läsning ger samma text och databasposten förblir oförändrad. Befintliga lås-, versions- och skolåtkomstkontroller passerar.
- Faktisk Editor/Sheet i lokal browserharness med simulerade API-svar: äldre lokalt Komvuxutkast, återöppning, bevarad egen inledning, nya fält i sparpayload, mobil 390 px och inga browserfel.
- Lokal PDF: standardtexten ryms utan overflow på en stående A4, 594,960 × 841,920 pt. PDF-texten innehåller `***` och saknar 50 veckor/1 200 poäng. Exporten renderades med Poppler och granskades visuellt. Bildvalet är fortfarande redaktörens uppgift.
- Lint, TypeScript och produktionsbuild kontrolleras lokalt. Build använder en avsiktligt oåtkomlig lokal databasadress; Better Auth-varningen bevisar inte ett fel i liveanslutningen och builden verifierar inte denna.
- Ingen manuell Vercel-publicering eller live-datamigration ingår. Faktisk Vercel/Neon har inte verifierats.
