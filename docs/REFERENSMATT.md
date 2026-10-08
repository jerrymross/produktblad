# Mätning av Kock-referensen

Mätt lokalt den 7 oktober 2026 från `references/Kock.pdf` med PDF-objekt/textkoordinater och visuell rendering. Koordinaterna nedan anges i **punkter från sidans övre vänstra hörn**. Mätvärdena gäller referens-PDF:en; de är inte designvärden som gissats från en skärmbild.

| Element | Referensmått eller position | Prototypens inställning |
|---|---:|---:|
| Sida | 595,276 × 841,89 pt; en stående A4 | 595,276 × 841,89 pt CSS; PDF-kontroll nedan |
| Inbäddat foto | x=0, y=0, objektbredd 695,44, objektshöjd 298,15; sidans högra kant klipper bilden | Höjd 298,15 pt, beskärning från vänster |
| Övre etikett | första ordet x=25,58, y=29,88; Lora Bold 9 pt | vänster 25,5 pt, topp 28,2 pt |
| Stor rubrik | ”Utbilda” x=25,58, y=95,99; ”till” x=25,58, y=157,94; Lora Bold 53,18 pt | block vänster 25,5 pt, topp 84,6 pt, 53,18 pt/1,16 |
| Ingress | ”Drömmer” x=25,58, y=238,58; Lora Bold 9 pt | vänster 25,5 pt, topp 237,2 pt |
| Vänster spalt | ”Varför” x=47,18, y=323,36; brödtext börjar y=341,87 | vänster 47,3 pt, topp 322 pt |
| Höger spalt | ”Så” x=307,43, y=323,36; brödtext börjar y=341,87 | vänster ca 307,8 pt, topp 322 pt |
| Andra vänsterrubrik | ”Det” y=474,56 | flödesplacerad efter första avsnittet |
| Fler högerrubriker | ”Utbildningsform.” y=414,56; ”Vem” y=475,76; ”Ekonomisk” y=590,96 | flödesplacerade i höger spalt |
| Nederdelens text | ”Astar” x=57,38, y=714,74 | vänster 57 pt, blocktopp 707,7 pt |
| Kontakter | ”LenaMaria” x=298,00, y=781,66; ”Amanda” x=422,11, y=781,51 | separata fasta kontaktkolumner |
| Adress | ”Industrivägen” x=83,99, y=808,96 | under standardloggan, i samma fasta adressyta |

Fontnamn i PDF: Lora Bold, Inter Light/Regular/Bold och en MyriadPro-post. Färg för Lora-rubrikobjekt: blå ungefär RGB (0,141, 0,231, 0,596), korall ungefär (1,0, 0,357, 0,302). Prototypen använder `#243b98` och `#ff5b4d`. Inbäddade fontnamn och koordinater bevisar inte rätt till originalets fullständiga fontfiler. Prototypen använder öppet licensierade Lora/Inter-filer från Fontsource, med licenser i `public/fonts/`.

Fotoextraktionen gjordes direkt från referens-PDF:ens enda bildobjekt, `Im0.jpg`. Den filen används lokalt för att pröva layouten. Rätt att distribuera originalbilden vidare behöver fastställas före publicering. Från `kock-1.0.1-prototyp` används användarens standardlogga `public/logo_liggande.png` i stället för den schematiska SVG/textloggan. Loggan ryms proportionellt i en centrerad yta om 144 × 31 pt. QR-koden är funktionell men pekar på en tydligt angiven testadress. Fullständig Astar-färgprofil, originalbildens användningsrätt och eventuell tryckspecifikation återstår att fastställa.

Ursprungliga måttabellen gäller `kock-1.0.0-prototyp`. `kock-1.0.1-prototyp` byter endast logotyp och dess proportionella inpassning; övriga layoutvärden behålls. Den lokala prototypen har ännu inget versionsarkiv för äldre mallrenderare.
