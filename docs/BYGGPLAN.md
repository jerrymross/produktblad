Aktuell uppdatering 9 oktober 2026: användaren har beställt full Neon-anslutning. Den är implementerad med Neon Postgres, Better Auth, privata medier, skolbehörigheter, versionshistorik och atomiska redigeringslås. Se [NEON.md](NEON.md). Nedanstående text bevarar den ursprungliga stegplanen och tidigare teknikval.

# Byggplan och acceptanskriterier

Status: steg 1 byggt och lokalt verifierat 7 oktober 2026. Se [VERIFIERING.md](VERIFIERING.md) och [REFERENSMATT.md](REFERENSMATT.md). Nästa steg beställs separat; ingen molnkoppling finns ännu.

Lokal utökning beställd 8 oktober 2026: skolbibliotek från användarens lista, val av skola eller alla produktblad och grön markering när ett blad finns sparat för aktuell mall. Detta är en utökning av den lokala prototypen, inte beställning av steg 2. Skolfilter, isolerade lokala utkast, sparmarkering, återöppning, återställning och befintlig PDF-export ska verifieras.

UI/UX-omtag beställt samma dag: tydligare bibliotek med kombinerade filter och bevarat filterval, avsnittsvis redigering, direktnavigation från preview/varningar, Ctrl+S, varning vid osparade ändringar och mobil växling mellan redigering/preview. Verifiera dessa flöden samt oförändrad A4-export. Idéer för fortsatt arbete finns i [UX-FORSLAG.md](UX-FORSLAG.md), utan att införas som godkända beslut eller starta steg 2.

## Steg 1 – lokal Kock-mall, redigerare och PDF

Skapa ett lokalt Next.js-projekt med TypeScript. App Router och Node.js för den lokala PDF-routen är tekniska rekommendationer. Välj versioner från aktuell officiell dokumentation vid implementation, lås installerade versioner och spara lockfil. Bevara dokumenten när projektet skapas. Ingen Supabase, inloggning eller Vercel-resurs behövs för detta steg.

1. Mät Kock.pdf och dokumentera layoutvärden samt vilka originalresurser som saknas.
2. Bygg en versionsbunden Kock-mall, separata innehållsfält och tydligt märkta exempeldata.
3. Lägg redigeringsfält bredvid en A4-förhandsvisning. Prova text- och bildändringar samt svenska tecken.
4. Prova överfull text med varning och provisorisk exportspärr enligt DESIGNREGLER. Produktregeln väntar på bekräftelse.
5. Bygg verklig lokal PDF-export med inbäddade typsnitt och samma renderingsmodell som preview. Välj exportmotor först efter tekniskt prov.
6. Granska i browser och rendera export-PDF för visuell jämförelse med originalet. Dokumentera avvikelser och faktisk verifiering.

### Acceptans för steg 1

| Prov | Förväntat resultat |
|---|---|
| Projekt/start | Appen startar lokalt från dokumenterade instruktioner; typecheck, lint och build för valda verktyg passerar. |
| Innehållsredigering | Rubrik, ingress, brödtext och kontaktfält kan ändras separat utan formändring. |
| Bildbyte | Byte till lokal testbild ger korrekt mallstyrd beskärning och samma bild i PDF. Detta avgör inte framtida uppladdningsrätt. |
| Fast design | Skolredigerarprototypen saknar kontroller för font, storlek, färg, marginal och fri position. |
| A4 | Exporten har exakt en stående A4 enligt kontrolltoleransen i DESIGNREGLER, utan browserheader/footer eller extra sida. |
| Font | Beslutade fontfiler/vikter laddas innan export och är inbäddade i PDF. ÅÄÖ/åäö samt alla exempeltextens tecken visas korrekt. |
| Geometri | Fontparametrar och marginal/spacing följer måttabellen. Förslag: positionsavvikelse högst ±1 mm; jämför vid samma skala. |
| Preview/export | Samma frysta data, mallversion och bild ger samma radbrytningar, spaltordning, bildbeskärning och footer. |
| Overflow | Precis passande text går att exportera. Text som överskrider en yta markeras i rätt fält och spärrar export i provet; ingen text döljs/krymps och ingen sida 2 tillkommer. |
| Randfall | Tomma valfria fält, långa kontaktuppgifter och om­laddning av fonter/bilder ger definierat resultat utan överlappningar. |
| Resursbrist | Saknad originalbild/font eller okänd användningsrätt är dokumenterad; prototypstatus framgår. Full referensöverensstämmelse hävdas först med rätt resurser. |

Leverera lokal app, startinstruktioner, måttabell, exempel-PDF, browser-/PDF-bilder och kort avvikelselista. Ingen Vercel-drift ska hävdas efter detta steg.

## Steg 2 – skolor, privata filer, Auth och säkra sparningar

När användaren beställer nästa steg: implementera den föreslagna modellen med migrationshistorik, privata filer, inloggning, medlemskap, central roll, versionshistorik och lås. Utred först kontaktsemantik, låstider, användaradministration och bildbehörighet. Externa DEV-resurser får skapas först efter användarens instruktion; håll produktion separat.

Implementera databastabeller, RLS, SQL-privilegier och Storage-regler tillsammans. Behörighet ska även gälla historik, export, duplicering, lås och bildreferenser. Undvik användarredigerbara metadata som källa för roller. Kontrollera medlemskap i databasen så att ändringar får genomslag vid känsliga operationer. Skolredaktörer får inte själva ge roller eller medlemskap.

För inloggning, använd aktuell SSR-guide och separata klient-/serverklienter. Verifiera serveridentitet, hantera tokenförnyelse och cache av sessionssvar enligt guiden. Lita inte enbart på användarobjektet från en obekräftad sessionscookie. [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).

Inför atomisk låstagning, förnyelse, utgång och sparning med versionskontroll. Bevara osparat innehåll när skrivning nekas. Implementera versionsåterställning som ny version. Förhindra direkta klientskrivningar som kringgår kontrollerna.

### Acceptans för skolåtkomst och filer

Använd minst två skolor A/B, en redaktör per skola, en användare med medlemskap i båda, en central administratör och en oinloggad klient. Prova även direkta API-/Storage-anrop, inte bara gränssnittet.

| Prov | Förväntat resultat |
|---|---|
| Isolering A/B | Redaktör A kan läsa/ändra A men nekas listning, läsning, historik, export, ändring och lås på B, även med kända id:n. Samma omvänt. |
| Medlemskap i två skolor | Användaren arbetar med A och B men saknar åtkomst till en tredje skola. Vald skola framgår. |
| Central admin | Kan läsa och redigera A/B samt hantera gemensamma mallar. Samma lås-/versionskontroll gäller. |
| Oinloggad | Kan inte läsa eller skriva blad, historik, privata media eller exporter. |
| Manipulerad request | school_id, mall-/mediareferens eller påstådd roll i klienten ger inte utökad åtkomst. |
| Medlemskap borttaget | Nästa skyddade operation nekas även om UI har gamla data; osparat innehåll bevaras. |
| Privat Storage | Obehörig direkt filhämtning och listning nekas. Auktoriserad hämtning fungerar; signerad länk löper ut efter konfigurerad tid. |
| Media | Skola A kan inte referera till privat bild från B; uttryckligt gemensam resurs fungerar. Historikens gamla bild förblir tillgänglig. |
| Rolltabeller | Redaktör kan inte skapa medlemskap, ändra central roll eller kringgå skrivkontroller. |
| Hemligheter | Inga server-/service-nycklar i browserbundle, publika env-fält, versionskontroll eller loggar. |

### Acceptans för lås, sparning och återställning

| Prov | Förväntat resultat |
|---|---|
| Lock-race | Två sessioner tar samma lediga lås samtidigt: exakt en lyckas; den andra får tydligt låst svar. |
| Samma användare, två fönster | Fönstren räknas som separata sessioner; ett lås kan inte återanvändas av det andra. |
| Förnyelse/tidsgräns | Rätt session kan förnya innan utgång. Efter konfigurerad livslängd utan heartbeat kan annan session ta låset. Databasens tid används. |
| Sen förnyelse | Förnyelse efter utgång/övertagande misslyckas och påverkar inte det nya låset. |
| Förlorat lås | Gammal token kan varken spara, återställa eller frigöra någon annans lås. Lokal text bevaras och felstatus syns. |
| Versionskonflikt | Två sparningar med samma förväntade revision ger exakt en ny version; den andra nekas och skriver inte över. |
| Transaktion | Fel mellan historik och bladskrivning rullar tillbaka båda; ingen halv sparning eller dubbla revisioner. Prova även förnyelse/övertagande under sparning. |
| Kringgående | Direkt REST/SQL-klientskrivning utan sparprotokollet nekas för redaktör, även med giltig inloggning. |
| Parallella blad | Lås på A-blad 1 hindrar inte en annan redaktör från att spara A-blad 2. |
| Frånkoppling | Ingen heartbeat efter nätverksavbrott. Låset löper ut, felaktigt ”sparat” visas inte och osparade ändringar finns kvar. |
| Återställning | Historisk version återställs till en ny revision med rätt mall, bilder och kontaktsnapshot. Mellanliggande historik finns kvar. |
| Kontaktstandard | Ändrad skolstandard/bladavvikelse följer bekräftad semantik; historisk preview/export använder sina frysta uppgifter. |
| Duplicering | Nytt blad-id, egen historik och eget lås; originalet ändras inte. Kontakt-/mediaregler följer vald skola. |

## Steg 3 – verifiera PDF på Vercel DEV

Detta kräver uttrycklig instruktion om DEV-deployment. Prova den valda PDF-motorn med riktiga inbäddade fonter, privata Storage-bilder och representativ filstorlek i den faktiska Vercel-miljön. Kontrollera kallstart, laddning av resurser, bundle/minne/tid, samtidiga exporter och felhantering. Lås export till identifierad bladversion och skydda exportvägen mot obehöriga anrop.

Vercels dokumenterade request-/responsegräns är 4,5 MB vid kontrollen den 7 oktober 2026. Större filer ska inte antas kunna skickas som vanlig function-body; prova lagring i privat Storage och auktoriserad nedladdning eller verifierad streaminglösning. Kontrollera gränser och valt abonnemang på nytt vid implementation. [Vercel Functions begränsningar](https://vercel.com/docs/functions/limitations).

Godkänt steg kräver samma en-sides-, font-, layout- och overflowprov som lokalt samt skolåtkomst från browser via server till databas/Storage. Rapportera deployment och faktiskt provresultat. En lyckad lokal PDF eller build räcker inte. Produktionspublicering är en separat användarinstruktion.

## Steg 4 – fler mallar och beslutad godkännandeprocess

Utöka mallbiblioteket när Kock-mallen, backend och verklig export är stabila. Prova att två olika mallar håller gemensam grafisk form och att äldre blad behåller sin mallversion. En malluppgradering får inte i tysthet ändra historik eller skapa overflow.

Godkännande och ”skicka vidare” införs först efter beslut om roll, statusövergångar, mottagare, behörighet, ändringar efter godkännande och vad handlingen faktiskt innebär. Ingen automatisk sändning ingår. Skolornas bilduppladdningar får ett separat beslut innan en sådan funktion aktiveras. Samtidig redigering och generell Illustrator-PDF-import är framtida utredningar.

## Föreslagen framtida kodstruktur

Detta är en rekommendation för implementationen, inte filer som finns i paketet:

```text
app/                      Next.js routes, redigerarsidor och framtida PDF-route
components/editor/        Innehållsfält, sparstatus och låsmeddelanden
components/sheet/         Gemensam versionsbunden bladrenderare
lib/templates/            Fältscheman, designparametrar och mallversioner
lib/sheets/               Validering, kontaktupplösning och snapshots
lib/pdf/                  Exportadapter och layoutkontroll
lib/supabase/             Klient/server, först från steg 2
fixtures/                 Tydligt märkta lokala exempeldata
supabase/migrations/      Versionsbundna migrationer, först från steg 2
tests/                    Relevanta layout-, åtkomst- och samtidighetsprov
docs/                     Krav, beslut, måttabell och verifieringsresultat
references/               Oföränderlig originalreferens
```

## Officiella källor och teknisk kontroll

Följande officiella sidor öppnades vid förberedelsen den 7 oktober 2026. De styr plattformsråden, inte appens egna produktbeslut. Ingen specifik paketversion är vald eller installerad. Kontrollera sidorna igen när respektive steg implementeras.

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation): App Router, TypeScript, Windows och miljökrav.
- [Next.js miljövariabler](https://nextjs.org/docs/app/guides/environment-variables): servervärden och browserexponering med NEXT_PUBLIC_.
- [Supabase SSR-klient](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs): server-/browserklient, verifierad identitet och session/cache.
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): radåtkomst för den föreslagna skolmodellen.
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control): policyer för privata objekt och privilegierade nycklar.
- [Supabase standard upload](https://supabase.com/docs/guides/storage/uploads/standard-uploads): uppladdningsmekanism om egna bilder senare godkänns.
- [Supabase privata nedladdningar](https://supabase.com/docs/guides/storage/serving/downloads): auktoriserad åtkomst och signerade länkar.
- [PostgreSQL SELECT/radlås](https://www.postgresql.org/docs/current/sql-select.html): transaktionsgrund för atomisk lås-/versionskontroll.
- [Vercel Functions begränsningar](https://vercel.com/docs/functions/limitations): runtime- och filbegränsningar för exportprovet.

Även [Supabase changelog-index](https://supabase.com/changelog) kontrollerades via dess Markdown-version. Den senaste granskade databasändringen rör särskilda extensions och operatorer, som inte ingår i den föreslagna modellen; kontrollera detta om de senare väljs. Se [Postgres-ändringen](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes). En separat [adapter-deprecation](https://supabase.com/changelog/supabase-server-adapters-deprecated) gäller andra serverframework; följ den aktuella Next.js SSR-guiden ovan. Kontrollera changelog på nytt före implementation. Supabase- och Vercel Functions-skills användes som arbetsstöd.
