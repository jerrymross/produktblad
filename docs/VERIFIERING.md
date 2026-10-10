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

### Zoomkontroller till höger – 8 oktober 2026

Zoomkontrollerna flyttades till en separat 80 px bred kolumn till höger om previewytan. Den tidigare kontrollraden ovanför bladet är borttagen, vilket frigör 54 px höjd på desktop. Verktygen ligger kvar när ett förstorat blad scrollas.

- Typkontroll, lint och build passerade.
- Browserflödet kördes mot lokal produktionsbuild på port 3001. Kontrollerna ligger till höger om previewytan. Helsida ryms utan scroll vid 1440 × 900 (cirka 57 %) och 1024 × 768 (cirka 45 %), jämfört med tidigare 52 % respektive 40 %.
- Mobil 390 × 844 granskades: samma högerspalt, hela bladet inom previewytan och ingen horisontell sidscroll.
- Zoom, återgång till helsida, separat redigerarscroll och overflowspärr vid 5 % passerade.
- PDF från 110 % zoom: HTTP 200, en stående A4 om 594,96 × 841,92 pt och fyra inbäddade fontdelmängder. Poppler-renderingen är pixelidentisk med exporten före flytten av zoomkontrollerna.
- Vercel och Supabase/RLS har inte provats.

## Etikettval, rubriker och återställning – 8 oktober 2026

Mallversion `kock-1.1.0-prototyp` har två fasta etiketter, sex separata rubrikfält och en rund återställningsknapp per rubrik/textfält under Innehåll. Tidigare standardrubriker behålls. Textstorlek och placering kan inte ändras.

- Typkontroll, lint och build passerade.
- Lokal browser: rullistan har exakt KOMVUX och ARBETSMARKNADSUTBILDNING. Valet syns direkt i preview. De sex rubrikerna börjar med sina tidigare texter.
- Ändrad rubrik och brödtext syns i preview och finns kvar efter sparning/omladdning. Rubrikåterställning ändrar endast den valda rubriken; brödtextåterställning ändrar endast sitt eget textfält.
- Överfull, obruten rubrik markerar rätt rubrikfält och spärrar export. Direkt API-anrop med annan etikett nekas med HTTP 400.
- Äldre Borås/AF-utkast från mall 1.0.2 läses in med sin bevarade ingress, nya standardrubriker och arbetsmarknadsetikett. Efter ny sparning finns båda snapshots kvar och aktuell mall får grön markering. Helbladsåterställning hindrar att det äldre utkastet återkommer efter omladdning, utan att radera dess snapshot.
- Browserbilder granskades vid 1440 × 900 och 390 × 844. Ingen horisontell mobilscroll.
- Lokal PDF med arbetsmarknadsetikett och rubriken ”Din väg till yrket” gav HTTP 200. Texten kan extraheras. PDF är en stående A4 om 594,96 × 841,92 pt med fyra inbäddade fontdelmängder. Poppler-renderingen granskades mot preview och den oförändrade referensen: nya texter visas utan överlappning, övriga fasta ytor är bevarade. Tidigare dokumenterade font-/radbrytningsavvikelser kvarstår.
- Exportknappen provades även i lokal produktionsbuild: HTTP 200 och vald arbetsmarknadsetikett samt standardrubrik skickades med.

Kontrollfiler finns i Git-ignorerade `work/check-fields.mjs`, `fields-*.png` och `fields-export.pdf`. Ingen Vercel-miljö eller Supabase/RLS har provats.

## UI/UX-omtag – lokal kontroll 8 oktober 2026

Omtaget gäller biblioteket och redigerarens arbetsyta. Bladkomponent, mallversion, fältschema, lagringsnycklar, A4-geometri och PDF-route har inte ändrats. Förslag för fortsatt arbete finns i `UX-FORSLAG.md`; steg 2 har inte påbörjats.

### Statiska kontroller

`npm run typecheck`, `npm run lint` och `npm run build` passerade. React-granskningen omfattade effektberoenden, städning av lyssnare/ResizeObserver, versionsbundna lokala data, härledda filterräknare, formuläretiketter, tangentbordsfokus och aria-status för filter/avsnitt. Inga beroenden installerades eller uppdaterades.

### Lokal browser

Verkliga flöden kördes med Chrome mot lokal produktionsbuild på port 3001. Bilderna granskades på desktop och mobil. Inga JavaScript-fel registrerades.

| Prov | Resultat |
|---|---|
| Bibliotek | 136 blad, 24 skolor. Kombinerad skol-/sökfiltrering, statusfilter med antal och återställning från tomläge fungerar. |
| Återvänd till bibliotek | Skola Umeå och sökord Kock behålls efter redigering. Filter lagras bara i samma browserfliks session. |
| Sparning | Ctrl+S sparar, status ändras till Sparat lokalt, ändrad text finns kvar efter omladdning. Grön markering och Sparade-filter visar rätt skolblad. |
| Återställning | Efter bekräftad återställning och omladdning är bladet tomt och dess gröna markering borttagen. |
| Avsnitt | Utbildning visar ett öppet avsnitt i taget. Rubrikåterställning ändrar inte brödtexten. |
| Klicka på preview | Klick på en innehållsrubrik öppnar rätt flik/avsnitt och fokuserar rubrikfältet. På mobil växlar samma klick tillbaka till redigeringen. |
| Osparad navigation | Länken Till biblioteket varnar. Avbruten navigation lämnar användaren och osparat innehåll kvar. `beforeunload` registreras endast när bladet är ändrat; browserns egna dialogregler gäller. |
| QR-adress | Nya blad visar en direktlänk till QR-fältet. Export är avstängd tills en adress med http/https-prefix har angetts. Sparning av ett ofullständigt utkast fungerar fortsatt. |
| Överfull rubrik | Lång obruten rubrik i ett stängt avsnitt spärrar export även från annan flik. Varningen öppnar rätt avsnitt och fokuserar fältet. Återställning tar bort varningen. |
| Desktop 1440 × 900 | Helsida cirka 58 %, ingen scroll på sidan eller i helsidepreview. Zoomverktyg ligger till höger. |
| Laptop 1024 × 768 | Helsida cirka 46 %, ingen scroll i helsidepreview. |
| Mobil 390 × 844 | Växling mellan Redigera/Förhandsvisa fungerar. Helsida cirka 36 %, ingen horisontell sidscroll eller scroll i helsidepreview. Skola/utbildning syns även i mobilpreview. |
| Zoom | 100 %, plus och Visa hela bladet fungerar; återgång till helsida ger ingen intern scroll. Hoverkontrast och större mobila tryckytor granskades. |
| Exportknapp | HTTP 200; vald arbetsmarknadsetikett och ändrad rubrik skickas till PDF-routen. |

### Lokal exporterad PDF

Exporten renderades med Poppler och granskades. En stående A4, 594,96 × 841,92 pt, fyra inbäddade fontdelmängder och standardlogga. Exporten med arbetsmarknadsetikett och rubriken ”Din väg till yrket” är pixelidentisk med exporten före UI/UX-omtaget vid samma 1200 px skala. Det visar att detta omtag inte ändrat bladets renderade geometri eller radbrytningar. Tidigare dokumenterade avvikelser från referensens font-/radbrytning kvarstår. `references/Kock.pdf` har oförändrad SHA-256: `970CB056F85731AC8C5EBDF435AF2180490664B425A0BEE96C45BA028EE6DDCA`.

Kontrollfiler och bilder finns i Git-ignorerade `work/check-ux.mjs`, `work/check-ux-pdf.py`, `work/ux-*.png` och `work/ux-export.pdf`. De är lokala QA-filer.

### Vercel och Supabase/RLS

Ingen faktisk Vercel-miljö eller Supabase/RLS har provats. Ingen molnresurs eller godkännandeprocess har skapats.

## Premiumtema – lokal kontroll 8 oktober 2026

Användaren beställde ett visuellt omtag med en integrerad logga utan vit box och frihet att välja andra gränssnittsfärger än Astars. Gränssnittet använder nu grafit, elfenben och olivgrönt, lokala Inter/Lora-filer, förfinad rubrikhierarki, diskreta skuggor och avrundade kontroll-/kortytor. Toppbarens standardlogga visas i vitt med ett CSS-filter; bildfilen har verifierad transparens och behållaren saknar bakgrund. Ingen ny bildresurs eller beroende behövdes.

- Typkontroll, lint och produktionsbuild passerade.
- Lokal Chrome mot produktionsbuild på port 3001: bibliotek, exempelredigerare och mobilredigerare granskades visuellt. Vit logga ligger direkt mot grafitbakgrunden. Originalets proportioner behålls.
- Befintliga användarflöden passerade: filter, bevarat skolval, Ctrl+S, sparmarkering, återöppning, återställning, avsnitt, previewnavigation, avbruten navigation med osparade ändringar, QR-vägledning, överfullhetsvarning, mobilväxling och PDF-export. Inga browserfel registrerades.
- Helsida ryms utan scroll: cirka 58 % vid 1440 × 900, 46 % vid 1024 × 768 och 36 % vid 390 × 844. Zoomverktygen ligger fortsatt till höger.
- Exportknappen gav HTTP 200. PDF: en stående A4 om 594,96 × 841,92 pt och fyra inbäddade fontdelmängder. Poppler-renderingen är pixelidentisk med tidigare export för samma innehåll. A4-mall och referens-PDF är oförändrade; tidigare dokumenterade font-/radbrytningsavvikelser mot referensen kvarstår.
- Lokal QA använder `work/check-ux.mjs`, `work/check-ux-pdf.py` och `work/ux-*.png`/`work/ux-export.pdf` i Git-ignorerade `work/`.
- Ingen Vercel-miljö eller Supabase/RLS har provats.

## Gemensam text om Astar – 8 oktober 2026

Användarens text är standard i nederdelen för alla nya blad. Ett fast fetstilt Astar följs av ett mellanrum och brödtexten. Även äldre värden som börjar med Astar visas utan dubblerat företagsnamn. Om Astar har en egen återställningsknapp under Kontakt; sparade egna texter behålls.

- Typkontroll, lint och build passerade.
- Lokal browser: Komvux, AF och AF RUB visar samma standardtext. Egen text bevaras vid sparning/omladdning; ↺ återför standardtexten.
- Lokal PDF gav HTTP 200 och en stående A4 om 594,96 × 841,92 pt. Poppler-renderingen granskades: standardtexten ryms mellan nederdelens linjer, med Astar i fetstil och utan överlappning med logga eller kontakter.
- QA-filer finns i Git-ignorerade `work/check-about.mjs` och `work/about-default*`. Vercel och Supabase/RLS har inte provats.

## Ny övre etikett – 8 oktober 2026

Rullistan har även **PRAKTISK UTBILDNING / MED STORA MÖJLIGHETER TILL JOBB**, med lagrad radbrytning efter UTBILDNING. Befintlig `white-space: pre-line` ger två rader utan ändrade mallmått.

- Typkontroll, lint och produktionsbuild passerade.
- Lokal Chrome: valet sparades och fanns kvar efter omladdning. Etiketten mäter två rader, ryms inom sin bredd och slutar ovanför korallstrecket.
- Browserexport gav HTTP 200. Export-PDF granskades efter Poppler-rendering: två textrader utan överlappning, en stående A4 om 594,96 × 841,92 pt och fyra fontresurser. Båda textraderna kan extraheras.
- QA-filer: Git-ignorerade `work/check-practical-label.mjs`, `work/practical-label.png`, `work/practical-label.pdf` och `work/practical-label-pdf.png`. Vercel och Supabase/RLS har inte provats.

## Bildgradient – lokal kontroll 8 oktober 2026

Mall `kock-1.2.0-prototyp` lägger till `gradientStyle` (none/white/navy) och `gradientStrength` (strängvärden 1–4). Förinställd riktning är vänster till transparent åt höger; styrkorna är 25/45/65/85 procents opacitet vid vänsterkanten. Mörkblått ger vit omslagstext, med fortsatt korallfärgat yrkesord. Ingen gradient är standard. Detta är användarens uttryckligen beställda, begränsade mallval.

- Typkontroll, lint och produktionsbuild passerade.
- Lokal Chrome mot produktionsbuild på port 3001: båda färgerna och alla fyra styrkor gav åtta olika gradienter. Rubrikens uppmätta position och storlek är oförändrade. Ingen tar bort överlägget och stänger av styrkeknapparna.
- Vit och mörkblå styrka 4 sparades, laddades om och exporterades genom browserknappen med HTTP 200. Valen finns i samma frysta innehåll som skickas till PDF-routen. Även direkt export utan gradient gav HTTP 200.
- API-anrop med annan färg, styrka 5 eller numerisk styrka nekades med HTTP 400. Parametrarna kan inte användas för att ange godtycklig CSS.
- Tidigare 1.1-utkast med egen rubrik, egen text, ett uttryckligt tomt fält och manuellt vald arbetsmarknadsetikett lästes in utan ändring och utan gradient. Sparning skapade aktuell version och grön markering; den äldre JSON-snapshoten är oförändrad. Tidigare återställningsflagga hindrar att en 1.0.2-snapshot återupplivas.
- Mobil 390 × 844 granskades i redigerings- och previewläge. Gradientvalet går att använda utan horisontell sidscroll.
- Lokal PDF: alla tre exporter har en stående A4 om 594,96 × 841,92 pt med fyra inbäddade fontdelmängder. Poppler-renderingarna granskades. Exporten utan gradient är pixelidentisk med tidigare mall för samma innehåll. För vit/mörkblå finns pixeländringar endast i omslagsbildens område; samtliga pixlar i textspalter och footer är oförändrade. Referens-PDF ändrades inte; tidigare dokumenterade font-/radbrytningsavvikelser kvarstår.
- Kontrollfiler finns i Git-ignorerade `work/check-gradient.mjs`, `work/check-gradient-pdf.py` och `work/gradient-*.png`/`work/gradient-*.pdf`. Ingen Vercel-miljö eller Supabase/RLS har provats.

## Förinställd Komvuxtext – lokal kontroll 8 oktober 2026

Användarens fyra texter om upplägg, utbildningsform, målgrupp och ekonomi ligger i `KOMVUX_DEFAULT_CONTENT`. Nya katalogblad med program Komvux får dessa texter, och fältens återställningsknappar använder samma standard. AF/AF RUB behåller tomma brödtexter. Textens inklistrade radbrytningar har sammanfogats inom styckena så att mallen styr radbrytningen. Mallgeometri, fältschema, version och lagringsnycklar är oförändrade.

- Typkontroll, lint och produktionsbuild passerade.
- Lokal Chrome på port 3001: nya Komvuxblad för Umeå och Borås visar standardtexterna. Ändrad text och ett uttryckligt tomt sparat fält bevaras efter omladdning. Återställning av ett fält återför bara dess text och lämnar andra ändringar kvar.
- Helbladsåterställning återför standardinnehållet och tar bort aktuell sparning. Standardtexter räknas inte som ett sparat utkast innan användaren sparar. AF-blad i Borås har fortsatt tomma brödtexter.
- Export via browserknappen gav HTTP 200 och skickade alla fyra standardtexter. Lokal PDF har en stående A4 om 594,96 × 841,92 pt. Tre använda fontdelmängder är inbäddade i detta blad med tomma övriga fält; alla fyra stycken kan extraheras ur PDF.
- Browser-preview och Poppler-rendering granskades: högerkolumnens standardtexter ryms utan överlappning och följer den befintliga mallgeometrin. Oförändrad referenslayout och tidigare dokumenterade font-/radbrytningsavvikelser kvarstår.
- Kontrollfiler finns i Git-ignorerade `work/check-komvux-defaults.mjs`, `work/check-komvux-pdf.py`, `work/komvux-defaults.png`, `work/komvux-defaults.pdf` och `work/komvux-defaults-pdf.png`. Ingen Vercel-miljö eller Supabase/RLS har provats.

## Mörk Astar-palett med korallaccent – 8 oktober 2026

Efter användarens ändrade färgval ersattes elfenben/olivgrönt med ett mörkt Astar-inspirerat gränssnitt: djup marinblå (`#111a2d`), blågrå ytor och dämpad korall (`#d98278`) på huvudknappar, aktiva val och fokusmarkeringar. Sparade utkast är fortsatt gröna. Standardloggan visas vit och utan box även på felsidan. Ändringen gäller bara gränssnittets CSS, inte A4-mallen.

- Typkontroll, lint och produktionsbuild passerade.
- Lokal Chrome på port 3001: bibliotek, exempelredigerare och mobilredigerare granskades. Befintliga browserflöden i `work/check-ux.mjs` passerade utan JavaScript-fel.
- Helsida: cirka 58 % på desktop 1440 × 900, 46 % på laptop 1024 × 768 och 36 % på mobil 390 × 844. Ingen scroll i helsidepreview.
- Kontrast mätt från faktiska browserfärger: exportknapp 5,68:1, textfält 12,74:1 och sparhjälptext 7,41:1. Felsidans vita logga verifierades i browser. Detta är riktade kontrastprov, inte en fullständig tillgänglighetsrevision.
- PDF-export: HTTP 200, en stående A4 om 594,96 × 841,92 pt och fyra inbäddade fontdelmängder. Poppler-renderingen är pixelidentisk med tidigare export för samma innehåll. Tidigare dokumenterade avvikelser mot originalreferensen kvarstår.
- QA-filer ligger i Git-ignorerade `work/`, inklusive `check-dark-colors.mjs` och `dark-not-found.png`. Ingen Vercel-miljö eller Supabase/RLS har provats.


## Bildreferens för arbetsytan – 8 oktober 2026

- Vit redigerare och toppbar, marinblå sidomeny, stående befintlig Astar-logga, korallaccent och varm previewyta. Sparknappar i toppbaren och zoom under bladet. Biblioteket följer samma tema.
- Statiskt: lint, TypeScript och produktionsbuild godkända. React-granskning: befintliga hooks behåller cleanup, dialog har rubrik och Escape-stängning, knappar och navigationslänkar har tillgängliga namn.
- Lokal Chrome på port 3001: bibliotek/filter, sparning med Ctrl+S, återläsning, grön sparstatus, återställning, varning före navigation, klick från preview till rätt fält, overflow och QR-validering godkända. Inga browserfel.
- Hela bladet ryms utan horisontell eller vertikal scroll i Anpassa vid 1440 × 900, 1024 × 768 och 390 × 844. Mobilens växling mellan redigering och preview fungerar. Expansionsknapp och inställningsdialog provade.
- Skärmbilder av bibliotek, omslag, utbildningsfält och mobil granskade lokalt. Bildreferensen styr arbetsytan; den oföränderliga Kock-referensen och A4-mallen har inte ändrats.
- Lokal export via den synliga PDF-knappen gav HTTP 200. Exporten har en A4-sida, 594,96 × 841,92 pt och fyra inbäddade fonter. Rasterisering vid 1200 px är pixelidentisk med tidigare verifierad export för samma innehåll (work/fields-pdf.png). Renderad PDF granskad.
- Ingen Vercel-miljö eller Supabase/RLS har ändrats eller verifierats.


## Tre rubrikrader och färgval – 8 oktober 2026

- Statiskt: build, lint och typecheck godkända. Mallversion 1.3 med validerade layout-/färgvärden. Gemensam renderare och overflowkontroll för preview/export.
- Lokal Chrome: Bagare och konditor ger exakt tre rader i det fasta 42 pt-läget. Blå och korall kan väljas per rubrikdel och överlever sparning/omladdning. Mobil preview vid 390 × 844 har ingen horisontell sidscroll.
- Ett 1.2-utkast lästes in med två rader och standardfärger utan att äldre snapshot skrevs över. Återställningsmarkörer respekteras i versionsordning.
- Tre lokala PDF-prov (tvåradigt exempel, treradigt yrke och treradigt med omvända färger över mörkblå gradient) gav HTTP 200, en A4-sida 594,96 × 841,92 pt och inbäddade fonter. Treradiga exporter rasteriserade och visuellt granskade mot preview: radbrytning, färger och avstånd till ingress stämmer. Kock.pdf är oförändrad; tre rader är en uttryckligt beställd mallvariant.
- För lång rubrik nekades med HTTP 422. Ogiltig färg nekades med HTTP 400. Ingen automatisk krympning eller klippning infördes.
- Vercel och Supabase/RLS har inte ändrats eller verifierats.

## Symmetriska rubrikfält – 9 oktober 2026

Rubrikrad och inledande ord ligger i två lika breda gridkolumner med gemensamma rader för etikett, textruta och färgval. Automatisk färg har kortare visningstext; förklaringen finns i väljarnas title. Lokal Chrome vid 1440, 1024 och 390 px: båda textrutorna respektive färgvalen har identiska y-positioner, bredder och höjder. Mobilskärmbild visuellt granskad. Produktionsbuild inklusive TypeScript godkänd. A4-renderare och PDF-kod är oförändrade; ingen ny PDF- eller molnverifiering ingår i denna fältjustering.
Lint startades men avslutades utan resultat efter att både full och riktad körning fastnat utan utdata. Build/TypeScript och browsergeometrin ovan är verifierade.

## Astar Studio-logga – 9 oktober 2026

Sidomenyn använder användarens astar-studio-logo-staende.png med originalets proportioner 1186 × 1326 och befintligt vitt CSS-filter. Alt-text och bibliotekslänkens namn är Astar Studio. Produktionsbuild inklusive TypeScript godkänd. Bildladdning verifierad lokalt i Chrome vid 1440 och 390 px, desktop visuellt granskad. Riktad lint för AppSidebar.tsx avslutades med exitkod 0. Produktbladets logga/renderare är oförändrad; ingen ny PDF- eller molnverifiering.


## Lokalt bildbibliotek per utbildning – 9 oktober 2026

- Två bildplatser för vart och ett av 86 normaliserade utbildningsnamn. Inställningar har uppladdning, ersättning, borttagning, sökning, saknat-filter och status per plats. Bildväljaren följer aktuellt blads katalogutbildning och kan bytas manuellt.
- Statiskt: produktionsbuild inklusive TypeScript och riktad ESLint för alla ändrade/nya TS-/TSX-filer godkända. React-granskning: prenumerationer rensas, asynkrona läsningar skyddas mot gamla resultat/avmontering, formulär har labels och dialogen använder native fokus/Escape.
- Lokal Chrome vid 1440 × 1000: tomt läge 0/86 och 172 saknade bilder, uppladdning av två varianter, 2/2-status, saknat-filter, bildval, sparning/omladdning, ersättning utan ändring av bladets tidigare bild, borttagning med uppdaterad status, felmeddelande för korrupt PNG samt byte/återgång mellan utbildningar provade. Inga browserfel.
- Mobil vid 390 × 844: uppladdningsdialog och kort granskade; ingen horisontell overflow. Desktopdialog med bilder granskad visuellt.
- Lokal PDF-export via editor-knappen gav HTTP 200. Export med bibliotekets bild gav en A4-sida och inbäddade fonter. PDF rasteriserad vid 1200 px och granskad. Pixelidentisk med tidigare två-radiga export för samma bild och innehåll; A4-mall och referens Kock.pdf oförändrade.
- Biblioteket sparas endast i aktuell webbläsare via IndexedDB; inga bilder delas ännu mellan datorer/användare. Testbilderna användes i isolerad browserprofil, inte förinstallerade biblioteksposter.
- Ingen Vercel-miljö, Supabase eller RLS ändrad/verifierad.

## Neon och publicerad Vercel-app – 9 oktober 2026

Neon produktblad-db skapad i Frankfurt, Free-plan. Skilda scheman och begränsade roller för produktion (studio) och utveckling/preview (studio_dev). Publicerad på https://produktblad.vercel.app.

Lokalt: lint utan varningar och produktionsbygge godkänt. Browser: text ändrad i Kock Eskilstuna, sparad version 1 och återöppnad med bevarad text. Integrationstest godkänt för inloggning, stängd registrering, anonym avvisning, gemensam sparning, gamla revisioner, konkurrerande lås, versionshistorik, skolbehörigheter, inbjudningar, privat bildåtkomst, PDF och utloggning. Direkt SQL-test bekräftade RLS, skyddad central roll och oföränderlig historik.

Live: samma integrationstest godkänt mot produktblad.vercel.app, inklusive Vercels Chromium-baserade PDF-export. Skol-ID:n transporteras som base64url i API-sökvägar efter ett upptäckt problem med dubbelkodade specialtecken på Vercel. Beständiga katalog- och utkast-ID:n är oförändrade. Testdata skapades i den nya tomma databasen; rensning väntar på godkännande. Ägarens privata engångsinbjudan har inte använts.

PDF lokalt renderad och visuellt granskad som en sida A4 med svensk text. Fasta A4-renderaren och layoutreferensen bevarade. Inga utbildningsfakta eller skolkontakter har hämtats automatiskt. Godkännande- och utskicksflöde har inte införts.

## Bilduppladdning direkt till Neon – 10 oktober 2026

Nya bildfiler skickas som multipart-filer till servern. Bildbiblioteket skriver filens byte-innehåll direkt till media-tabellen och kopplar den privata referensen till vald utbildning/bildplats. Direkt uppladdning i redigeraren skriver också filen direkt till media-tabellen, med skolbehörighet; Spara utkast sparar därefter själva bildvalet på bladet. JSON/data-URL stöds fortfarande för import av tidigare lokala bilder.

Servern identifierar JPG, PNG och WebP genom filens byte-signatur, inte enbart browserns MIME eller filnamn. Gränsen är fortsatt 2 MB per bild. Fel format och för stora filer avvisas; bilder serveras bara till behöriga inloggade användare. Inga generella dokumentuppladdningar har införts.

Lokalt godkänt: produktionsbygge, lint samt scripts/test-upload.ts. Testet bekräftar multipart-uppladdning, databaslagring/återläsning med identiska bytes, korrekt MIME även för PNG med JPG-filnamn, privat åtkomst, bibliotekets persistens och avvisning av ogiltiga/för stora filer.

Browserkontroll: riktig JPG vald med filväljaren, Bild 2 Finns och Bild 2 sparades i biblioteket visades. Skärmbild sparad separat som bilduppladdning-test.png. Live-publicering kontrolleras separat efter GitHub-push.

Livekontroll godkänd 10 oktober 2026 mot https://produktblad.vercel.app efter deployment dpl_5t7hhKuCLYEjopmuteHrgWiqx68q: multipart-uppladdning både till privat bladmedia och bibliotek, identiska byte vid återläsning, MIME från filinnehåll, anonym avvisning samt ogiltig/för stor fil avvisad. Testet återanvände en befintlig syntetisk testplats i biblioteket; användarnas övriga bilder och blad ändrades inte. Äldre testdata är fortfarande kvar i väntan på tidigare efterfrågat rensningsgodkännande.

## Automatisk QR-kod per skola – 10 oktober 2026

QR-adressen skapas från skolnamnet: http://astar.se/ följt av gemener, å/ä som a, ö som o och bindestreck mellan ord. Norrköping blir http://astar.se/norrkoping och Solna Centrum blir http://astar.se/solna-centrum. Dessa två skoladresser kontrollerades mot astar.se.

Nya blad får adressen direkt. Vid öppning av aktuella befintliga blad används skolans automatiska QR-adress. Fältet visas skrivskyddat för skolblad. Servern sätter samma adress när en ny bladversion sparas, även vid lokal import eller återställning från tidigare version. Gamla historikversioner/exportunderlag ändras inte i efterhand. Exempelbladet utan skola behåller sin redigerbara testadress.

Lokalt: lint och produktionsbygge godkända. scripts/test-school-qr.ts kontrollerar svenska ortnamn, samtliga katalogposters standardadress samt att servern korrigerar en felaktigt inskickad QR-adress och sparar samma adress i historiken. Adress för Astar Nationellt genereras enligt samma namnbaserade regel (astar-nationellt); någon separat nationell sidadress har inte verifierats.

Livekontroll godkänd på produktblad.vercel.app efter deployment dpl_G933k9Jd86D94Y2RQaQzuYHoE3j1: Norrköpings aktuella blad returnerar automatiskt http://astar.se/norrkoping. Inga befintliga produktionsblad skrevs om i verifieringen; sparning och historik verifierades i utvecklingsmiljön.

## Besöksadresser 10 oktober 2026

Användarens adresslista kopplas per skola och utbildning enligt docs/BESOKSADRESSER.md. Build, lint och typkontroll i build passerade. scripts/test-school-addresses.ts verifierar utbildningsgrenar, okända adresser, manuella avvikelser, sparning i lokal utvecklingsdatabas, bevarad historik och verklig PDF-export. Lokal webbläsare visar Norrköping Kock med Sprängstensgatan 1 A. PDF i lokal färdigbyggd app blev 1 A4 och granskades renderad med adressen under logotypen. Utvecklingsserverns PDF laddade om under export; PDF-kontrollen gjordes därför mot next start. Testbladets långa yrkesrubrik kortades till Kock i testinnehållet för att pröva adressen inom befintlig A4-gräns.

Publicerat på https://produktblad.vercel.app: dpl_68CMpNkSPqEEX4UDWLR9RiBVSZqm, status READY. Samma adresskontroll passerade mot produktion med inloggning och läsning av Norrköping Kock i språkkombination. Inga befintliga produktionsblad skrevs över i testet. PDF och visuell webbläsarkontroll ovan är lokala kontroller.
