# Umeås utbildningstexter från användarens PDF-underlag

Beställt 12 oktober 2026: lägg rätt text i respektive produktblad i Umeå, från användarens produktblad umeå.zip. Användaren valde att behålla texten exakt och anpassa den fasta mallen när fem av texterna inte rymdes i den tidigare formen.

## Matchning

Underlag och innehållshash per PDF finns i fixtures/umea-content.json. Varje källa används bara för Umeå + Komvux + den uttryckliga katalogutbildningen:

| PDF i zip-filen | Produktblad |
|---|---|
| Bagare&Konditor.pdf | Bageri och konditori |
| Yrkessvetsare.pdf | Yrkessvetsare |
| VVS-montör.pdf | VVS-montör |
| Träarbetare.pdf | Träarbetare |
| Plattsättare.pdf | Plattsättare |
| Kock.pdf | Kock |
| Murare.pdf | Murare |
| hotell.pdf | Hotell & Turism |
| försäljning&service.pdf | Handel och försäljning |
| Frisör.pdf | Frisöraspirant |
| Fastighetsskötare.pdf | Fastighetsskötare |
| elektiker.pdf | Elektriker |
| cnc-operatör.pdf | CNC-operatör |
| Betongarbetare.pdf | Betongarbetare |

Umeås AF-blad och Yrkessvetsare påbyggnad saknar separata underlag och ändras inte. Innehåll läses som användarbeställt material, inte som instruktioner eller en oberoende faktagranskning av utbildningsuppgifterna. Tryckets mjuka radbrytningar reflowas till innehållsfälten utan ändrade ord. Rubriker, omslagstext, ingress, de sex textavsnitten, Astar-text, adress och kontaktpersoner följer respektive PDF. Bilder ändras inte av textimporten: tidigare val bevaras, annars används appens befintliga yrkesbild.

## Fast Umeå-mall

Ny separat version: komvux-umea-1.0.0, med layoutvärdet umea. Komvux-mallens befintliga A4, hero, spaltbredder, rubriker och footer används. Textspalternas höjd ökas från 339 till 372 pt och brödtexten använder 9,4 pt med 11,3 pt radavstånd. Spalterna slutar vid 694 pt, före Astar-texten vid 707,7 pt. Alla Umeåblad i denna import använder samma fasta värden; ingen automatisk krympning eller fri designkontroll införs.

LÄRLINGSUTBILDNING / MED STORA MÖJLIGHETER TILL JOBB läggs till som fast etikettalternativ för underlagens tre lärlingsblad. Standardmallen och AF-mallen behåller sina tidigare CSS-värden. Gamla frysta innehållsversioner med standard/af ändras inte. Bara de 14 angivna Umeåutbildningarna får nytt standardinnehåll/mall-ID. Egna redigerade kopior och andra skolors data behålls.

## Import och säkerhet

scripts/import-umea-content.ts använder en begränsad runtime-anslutning och skyddad adminidentitet. Hela importen är en transaktion. Varje blad låses, aktiv redigeringssession och adminlås kontrolleras, innehåll valideras, och en ny innehållsversion skapas. Befintligt bildval och historik bevaras; bilder fryses genom stabila privata mediereferenser. Adminlåsta eller aktivt redigerade blad avbryter hela importen. Ingenting låses eller publiceras automatiskt.

Skriptet kör provimport med ROLLBACK som standard. --apply krävs för sparning. Anslutningsfiler kan läsas från en befintlig ignorerad katalog utan att kopieras eller visas:

```powershell
npx.cmd tsx scripts/import-umea-content.ts dev SÖKVÄG_TILL_ANSLUTNINGSKATALOG
npx.cmd tsx scripts/import-umea-content.ts prod SÖKVÄG_TILL_ANSLUTNINGSKATALOG
# Efter verifiering:
npx.cmd tsx scripts/import-umea-content.ts dev SÖKVÄG_TILL_ANSLUTNINGSKATALOG --apply
npx.cmd tsx scripts/import-umea-content.ts prod SÖKVÄG_TILL_ANSLUTNINGSKATALOG --apply
```

## Verifiering 12 oktober 2026

- 14 unika källor och matchningar. Inga saknade tecken. Text från vänster/höger PDF-spalt jämförd mot innehållsfälten efter normalisering av mjuka radbrytningar. Källfiler och layoutreferenser ändrades inte.
- Lokal browser: verklig Sheet-renderare, alla 14 innehållsversioner och appens yrkesbilder. Efter godkänd mallanpassning har samtliga tom overflowlista. QA: work/umea-import/preview-0–13.png och qa.json.
- Lokal PDF: alla 14 exporter skapade från samma innehåll och renderare, en stående A4 vardera. Text i båda spalter verifierad mot fälten och källorna; endast layoutstyrda radbrytningar normaliseras. Exporter renderade med Poppler och granskade. QA: export-0–13.pdf/png, export-overview.png och pdf-validation.json i work/umea-import.
- Statiskt: typecheck, lint, ny test-umea-content.ts samt uppdaterade Komvux-/AF-regressionstester passerade. Build passerade med oanvändbar lokal testanslutning och tillfällig testhemlighet; Better Auths varning om testdatabasen var förväntad.
- Faktisk Neon: provimport av alla 14 i DEV och produktion genomfördes och rullades tillbaka. Utbildningsmatchning, skolåtkomst, sessionlås, innehållsvalidering, bildlagring och versionsskrivning kontrollerades. Slutlig sparning och återläsning rapporteras nedan när den är genomförd.
- Vercel: inloggat browser-/PDF-flöde har inte provats för denna import. Ny rendering måste finnas i drift innan innehåll med layout umea sparas.

För nya blad i Umeåvarianten används appens befintliga vita gradient, styrka 4, så att den blå omslagstexten syns över de befintliga yrkesbilderna. Tidigare sparade bild-/gradientval bevaras vid import. Bildfilerna byts inte ut.
