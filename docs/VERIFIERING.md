# Verifiering av steg 1

Kontroller utförda lokalt 7 oktober 2026 på Windows med Node.js 24.19.0, Next.js 16.4.0 och lokalt installerad Chrome. Ingen Vercel- eller Supabase-miljö har provats.

| Kontroll | Resultat |
|---|---|
| Typkontroll, lint och produktionsbuild | Godkända. |
| Browser, 1600 px och 760 px bred | Redigerare och en skalad A4-förhandsvisning syns. Fälten uppdaterar samma bladkomponent. |
| Textändring | Yrket ”kock” byttes till ”bagare” och ändringen syntes i förhandsvisningen. |
| Bildbyte | En lokal PNG laddades upp, syntes i förhandsvisningen, sparades i lokalt utkast och kom med i export-PDF. |
| Lokal sparning | Spara-knappen skrev utkastet till browserns localStorage. Ingen delad lagring eller historik ingår i steg 1. |
| Overflow | En lång ingress märktes som överfull och inaktiverade exportknappen. Direkt PDF-anrop med samma slags overflow fick HTTP 422. Normal exempeltext exporterades. |
| Gräns för overflow | Med provorden ”Utbildning ” accepterades 40 ord och 41 ord spärrades i ingressen. |
| PDF-export | Direkt API-anrop skapade en riktig PDF med en enda stående A4, 594,96 × 841,92 pt (avvikelse från 210 × 297 mm: ca -0,11 mm bredd, +0,01 mm höjd). |
| Nedladdningsknapp | PDF laddades ned i webbläsaren och gav en fil med PDF-innehåll. |
| Typsnitt/text | Fyra fontdelmängder (Lora Bold, Inter Bold/Light/Regular) har inbäddad FontFile2 i PDF. Svensk text inklusive ÅÄÖ/åäö kan extraheras. |
| Bild/PDF | Testbildens PDF hade en inbäddad bild och en A4-sida. |
| Visuell granskning | Exporten renderades som PNG och jämfördes med Kock.pdf vid samma skala. Bildbeskärningen justerades till originalets vänsterjusterade klippning. |

Mätpunkter för normalexport jämfört med referensen: vänster första rubrik x=47,3 mot 47,18 pt; höger första rubrik x=307,79 mot 307,43 pt; nederdelens text x=57,0 mot 57,38 pt. Grundgeometrin ligger under 1 mm avvikelse vid dessa mätpunkter. Fontens metrik gör att rubrikens bokstavsbredd och vissa radbrytningar ännu inte är exakt lika. Vid det ursprungliga provet var footerlogotypen schematisk; den ersattes vid provet nedan. QR-kodens innehåll är ett test. Den fulla visuella överensstämmelsen är därför **inte** godkänd.

Prototypen använder delar av referensens befintliga exempeltext. Texten får inte behandlas som verifierade aktuella utbildningsuppgifter. Bilder, logotyp och fontanvändning behöver rättighets- och originalfilskontroll före skarp användning. Tryckkrav (till exempel CMYK eller utfall) är inte beslutade.

PDF-routen använder lokalt installerad Chrome/Edge via Puppeteer. Den har provats med Chrome på denna dator. Edge-filen fanns men kunde inte startas i det automatiserade provet. Vercel-runtime, browserpaketering, tidsgränser, privata bilder och autentisering återstår för ett senare steg.

`npm audit --omit=dev` visade inga produktionsberoendesårbarheter i den lokala låsfilen. Full audit visade fem höga varningar i utvecklingsberoenden för ESLint/Next-konfigurationen; de behöver omprövas när plattformspaketen uppdateras. Ingen molndrift eller produktionssäkerhet kan utläsas av detta prov.

## Standardlogga – lokal kontroll 8 oktober 2026

Mall `kock-1.0.1-prototyp` använder `public/logo_liggande.png`, utsedd av användaren till standardlogga. Filen är 784 × 219 px med transparens. Den ersätter den schematiska loggan i produktbladet; redigerarens separata Studio-märke är oförändrat.

- Typkontroll, lint och produktionsbuild passerade.
- Lokal Chrome på port 3001: loggan laddades och granskades vid 1600 och 760 px browserbredd. Den visas centrerad med `object-fit: contain` i mallens fasta yta, utan beskärning eller förvrängning. Övriga footerfält behåller sina ytor.
- Exportknappen gav HTTP 200 och klarstatus. Ett separat API-anrop sparade en PDF om 298 546 byte för kontroll.
- PDF: en stående A4, 594,96 × 841,92 pt. Standardloggan är inbäddad som en bild om 784 × 219 px; samtliga fyra fontdelmängder har FontFile2. Svensk text kan extraheras.
- PDF renderades med Poppler och jämfördes visuellt med referensen och browsern. Loggan syns utan överlappning; tidigare dokumenterade font-/radbrytningsavvikelser och test-QR återstår. Referensfilen är oförändrad.
- Kontrollfiler finns lokalt i den Git-ignorerade mappen `work/logo/`.

Ingen Vercel-miljö eller Supabase/RLS har provats i denna ändring.

## Skolbibliotek och konsekvent logga – lokal kontroll 8 oktober 2026

Startsidan och `/produktblad` visar användarens underlag: 136 unika poster, 24 skolor, från 193 källrader. Mallversionen är `kock-1.0.2-prototyp`. Den gemensamma standardloggan används i bibliotekets och redigerarens header, browserikon, förhandsvisning och PDF. Den tidigare ritade Studio-symbolen och SVG-ikonen har tagits bort.

| Kontroll | Resultat |
|---|---|
| Typkontroll, lint, produktionsbuild | Godkända. |
| Skolval och Alla produktblad | Alla 136 poster visas; Umeå-valet visar 16 poster från just Umeå. Sökning på Kock ger rätt post. |
| Sparmarkering | Initialt ingen grön markering. Spara utkast på Umeå/Kock ger grönt för just den posten och aktuell mall. |
| Separata utkast | Jönköping/Kock börjar tomt även efter sparning av Umeå/Kock. Olika ingresser sparas och återöppnas utan att blandas. |
| Omladdning | Sparad ingress finns kvar efter omladdning. Biblioteket visar rätt antal sparade blad. |
| Återställning | Återställ till tomt blad tar bort den postens lokala sparning och gröna markering; andra skolans sparning finns kvar. |
| Browser och logga | Granskat i lokal Chrome vid 1600 och 390 px bredd. Biblioteket har ingen horisontell sidscroll på mobil. Samma 784 × 219 px logga laddas i header och produktblad. |
| PDF-flöde | Exempelbladets exportknapp och direkt API-anrop gav HTTP 200 efter att startsidan ändrats till bibliotek. PDF-routen öppnar nu `/?exempel=1` som utskriftskälla. |
| Export-PDF | En stående A4, 594,96 × 841,92 pt. Fyra inbäddade fontdelmängder samt standardloggans bild finns. Renderad med Poppler och jämförd med referensen och browserbilden. Tidigare dokumenterade typografiska avvikelser och test-QR kvarstår i exempelbladet. |

Kontrollfiler finns i Git-ignorerade `work/`, bland annat `check-catalog.mjs`, browserbilder och `catalog-example.pdf`. Kontrollen gjordes på port 3001 eftersom port 3000 användes av en annan projektkopia på datorn.

Biblioteksposter är underlag för blad, inte 136 färdiga PDF:er. Nya poster har inga påhittade utbildningsfakta eller kontakter. Grönt betyder ett giltigt sparat lokalt utkast, enligt användarens beslut; ingen godkännandeprocess infördes. Utkastens nyckel innehåller skol-/utbildningsidentitet och mallversion. Kock-exempelutkastets tidigare nyckel behålls separat. Inget automatiskt byte av skola eller kopiering av dess uppgifter sker.

Ingen Vercel-miljö eller Supabase/RLS har provats. Skolfiltret är endast lokal navigation och innebär ingen serverbaserad behörighetskontroll; steg 2 väntar fortsatt.

## Fast förhandsvisning och zoom – lokal kontroll 8 oktober 2026

På desktop håller redigerarens arbetsyta browserfönstrets höjd. Förhandsvisningen ligger kvar medan vänsterfält scrollas separat. Standardläget ”Visa hela bladet” mäter både tillgänglig bredd och höjd med ResizeObserver. Manuell zoom (5–200 %), 100 % och återgång till helsida finns. Zoom ändrar endast previewns transform, inte mallversion eller innehåll. Överfullhetskontrollens geometriska toleranser följer visningsskalan så att samma text inte blir godkänd vid utzoomning.

| Kontroll | Resultat |
|---|---|
| Typkontroll, lint, build | Godkända. |
| Desktop 1440 × 900 | Hela bladet ryms vid cirka 52 %. Ingen horisontell eller vertikal scroll i preview eller på sidan. |
| Laptop 1024 × 768 | Hela bladet ryms vid cirka 40 %; sidan saknar vertikal scroll. |
| Separat redigerarscroll | Scrollning av vänsterfält flyttar inte högersidans förhandsvisning. |
| Zoom | 100 %, plus och minus fungerar. Förstorad preview kan scrollas internt. Helsideknappen återgår till anpassning och nollställer scrollningen. |
| Ändrad fönsterstorlek | Anpassningen räknas om efter ändring av bredd och höjd. |
| Mobil 390 × 844 | Preview ligger under redigeraren; hela A4 ryms i dess egen previewyta. Ingen horisontell sidscroll. |
| Overflow | Överfull ingress spärrar export vid anpassad zoom, 100 % och 5 %. |
| PDF vid manuell zoom | Export från 110 % preview gav HTTP 200. PDF är en stående A4, 594,96 × 841,92 pt, med fyra inbäddade fontdelmängder och standardlogga. |
| Visuell PDF-kontroll | Exporten renderades med Poppler. Rasterjämförelse mot föregående export vid samma 1200 px skala gav ingen pixelavvikelse. Tidigare dokumenterade avvikelser mot referensen är oförändrade. |

Browserflödet finns lokalt i `work/check-zoom.mjs`; browserbilder, `zoom-export.pdf` och `zoom-pdf.png` ligger i samma Git-ignorerade mapp. Vercel och Supabase/RLS har inte provats i denna uppdatering.
