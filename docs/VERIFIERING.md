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
