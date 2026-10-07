# Designregler

Status: fasta produktprinciper och underlag för mallimplementering, 7 oktober 2026. Exakta designvärden är ännu inte fastställda.

## 1. Godkända formprinciper

Varje produktblad är en enda stående A4, 210 × 297 mm. Mallen styr typsnitt, textstorlekar, radavstånd, styckeavstånd, spaltavstånd, marginaler, färger, bildytor och placering. Skolredaktören ändrar innehåll i separata fält och väljer bilder inom mallens regler. Ingen fri placering, fontväljare eller fri CSS ska finnas i redigeraren.

Flera mallar får ha olika layout men ska ingå i samma grafiska form. Publicerad mallversion är oföränderlig; en ändrad layout blir en ny version. Befintliga blad och historik ska inte byta utseende utan en uttrycklig malluppgradering.

## 2. Referensen Kock.pdf

`../references/Kock.pdf` är en oförändrad kopia av `C:/Users/JerryRoss/Downloads/Kock.pdf`. Referensen har i ursprungsgranskningen rapporterats som en sida, 595,276 × 841,89 punkter, motsvarande A4.

Rapporterad visuell struktur:

- Stor bild med rubrik och ingress i den övre delen.
- Två textspalter med avsnitt om yrke, lärande, upplägg, utbildningsform, målgrupp och ekonomi.
- Nederst Astar-information, logotyp, adress, QR-kod och kontakter.

Den ursprungliga PDF-granskningen identifierade inbäddade fontnamn för Lora Bold och Inter Light/Regular/Bold samt en MyriadPro-post. Namnen är ledtrådar. De fastställer inte exakta fontfiler, vilka element som använder respektive font, kompletta teckenuppsättningar eller användningsrätt. De ersätter inte en mätning av PDF:en vid implementation.

Referensens utbildningstext är exempelmaterial. Aktuella uppgifter om utbildning, målgrupp och ekonomi måste granskas separat innan skarpa blad används.

## 3. Mätning före mallbygge

Upprätta en versionsbunden måttabell i steg 1 och fyll den från referensen. Följande uppgifter ska mätas eller fastställas, inte gissas:

| Del | Värden att fastställa |
|---|---|
| Sida | MediaBox/CropBox, orientering, alla sidmarginaler och eventuell utfallsregel. |
| Bild | Position, bredd/höjd, beskärning, fokuspunkt och förhållande till rubrik/ingress. |
| Rubrik/ingress | Fontfil/vikt, storlek, radavstånd, textbredd, position och avstånd. |
| Brödtext | Fontfil/vikt, storlek, radavstånd, styckeavstånd, avstavning och radbrytning. |
| Spalter/avsnitt | Spaltbredd, spaltmellanrum, rubrikhierarki, ordning och sektionsavstånd. |
| Footer | Avstånd, logotypens proportioner, adress, kontaktfält och QR-yta. |
| Färger | Godkända färgvärden, kontrast på bild och eventuell tryckfärgshantering. |
| Resurser | Originalbilder/logotyp, fontfiler, källa/användningsrätt och QR-mål. |

Dokumentera mätmetod, värden och avvikelser. Om originalresurser saknas, använd synligt dokumenterade ersättningsresurser i prototypen. Hävdad full överensstämmelse väntar tills rätt resurser är tillgängliga och kontrollerade. Inbäddade delmängdsfonter ska inte utan utredning extraheras och användas som appens kompletta fontbibliotek.

## 4. Innehållsfält och validering

Föreslagna fält för första Kock-mallen är rubrik, ingress, hero-bild, yrkesbeskrivning, lärande, upplägg, utbildningsform, målgrupp, ekonomi och skolkontakt. Den exakta indelningen fastställs mot originalet. Varje fält får stabilt id och typ i mallversionens schema; innehållet lagrar dessa värden utan designparametrar.

Bildfältet föreslås innehålla media-id och en begränsad fokuspunkt om mallen medger det. Bildyta och proportioner förblir mallstyrda. Om egna skolbilder inte godkänts används exempelbilder/gemensamma resurser; lokal testbild i steg 1 är ett tekniskt prov.

Tillåt bara de textformat mallen definierar. Klistrad text får inte föra med sig godtyckliga typsnitt, textstorlekar eller HTML. Validera även serverinnehåll före export. Fältlängdsgränser är vägledning; faktisk overflow måste mätas i renderad layout eftersom olika ord, fonter och radbrytningar tar olika plats.

QR-kod och kontaktfält måste vara innehållsdrivna inom fasta ytor. Använd en testdestination som är tydligt märkt i prototypen och fastställ verkligt mål innan skarp användning. Ändringar ska inte utlösa meddelanden eller publicering.

## 5. Föreslagen regel för överfullt innehåll

Produktregel att bekräfta: visa vilket fält som inte ryms, markera felet i redigeraren och stoppa PDF-export tills texten kortats. Spara utkast ska fortfarande vara möjligt, med tydlig varning. Varken textstorlek, mellanrum eller marginaler ska automatiskt krympas, och text ska inte kapas, döljas eller flyttas till sida 2.

I steg 1 får en provisorisk exportspärr implementeras för att prova regeln. Den ska dokumenteras som förslag, inte slutligt produktbeslut. Mät efter att fonter och bilder laddats och i samma layoutförutsättningar som exporten. Text som exakt ryms respektive överskrider gränsen ska ingå i provet.

## 6. Gemensam renderingsmodell

Rekommendation: en gemensam mallrenderare med versionsbundna parametrar för både browser-preview och PDF. Preview visar en proportionellt skalad A4, medan textens radbrytning beräknas i mallens fasta sidmått. Browserfönstrets bredd får inte ändra bladets interna layout.

Export får inte få en oberoende uppsättning marginaler, textmått och fontregler. Utvärdera HTML/CSS till PDF med kontrollerad print-CSS och browsermotor i steg 1, men lås inte PDF-bibliotek innan fontinbäddning, sidmått och runtime fungerar. Om annan PDF-motor väljs måste samma renderingsmodell och mätning verifieras uttryckligen.

Export ska vänta på typsnitt och bilder; fallback-font får inte råka användas i färdig fil. PDF:en ska innehålla riktiga textsjok och inbäddade typsnitt, inte bara en bild av sidan. Använd mallens sidmått och förhindra browserns egna headers/footers, skalning och extra marginaler.

Varje export kopplas till en sparad innehållsversion, exakt mallversion, mediereferenser och renderarversion. Historik behöver tillgång till dessa resurser även efter senare uppgraderingar. Långsiktig byteidentisk regenerering av PDF är inte ett löfte; behåll ursprunglig export när exakt fil behöver bevaras.

## 7. Visuell kontroll

Föreslagna kontrolltoleranser för steg 1: en PDF-sida med 210 × 297 mm inom ±0,2 mm, samt uppmätta huvudpositioner, marginaler och spaltavstånd inom ±1 mm från fastställd måttabell. Typsnitt, vikter, storlekar, radavstånd och avståndsparametrar ska exakt motsvara den beslutade malltabellen. Toleranserna är tekniska förslag och kan skärpas efter referensmätning.

Jämför referens, förhandsvisning och renderad export vid samma skala. Kontrollera rubrikens brytning, ingressens bredd, spaltordning, avsnittens avstånd, bildbeskärning, footer, logotyp och QR-kod. Kontrollera att ÅÄÖ/åäö och övriga använda tecken har korrekta glyfer och att inga fontsubstitutioner förekommer.

Text- och bildändringar ska ge samma synliga resultat i preview och export för samma sparade version. Ingen klippning, överlappning, dold text eller oavsiktlig andra sida accepteras. Prova även tomma valfria fält och långa kontaktuppgifter. Dokumentera avvikelser med bilder och tydlig status; en lokal build är inte visuell QA.

Detta definierar en vanlig produktblads-PDF. Särskilda tryckkrav som PDF/X, CMYK, utfall eller skärmärken är inte beslutade och ska utredas om tryckleverantören kräver dem.
