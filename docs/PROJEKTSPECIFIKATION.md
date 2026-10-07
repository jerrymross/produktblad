# Projektspecifikation

Status: projektunderlag, 7 oktober 2026. Ingen implementation eller extern resurs ingår i denna leverans.

## 1. Mål och godkända beslut

Skolor ska skapa och förvalta enhetliga svenska produktblad utan att behöva designa varje blad. Allt innehåll ska passa på en enda stående A4. Webbappen byggs med Next.js och TypeScript; Vercel används för hosting/serverfunktioner och Supabase för Postgres, Auth och Storage.

| Område | Godkänt beslut |
|---|---|
| Organisation | Flera skolor och flera användare; användare kan tillhöra flera skolor. |
| Åtkomst | Skolan är primär åtkomstnivå. Avdelningar kan tillkomma senare. |
| Central administration | Läsa och redigera alla skolors blad samt hantera gemensamma mallar. |
| Skolredaktör | Arbeta med blad för skolor som användaren tillhör. |
| Mallar | Flera layouter i ett gemensamt mallbibliotek och en gemensam grafisk form. |
| Redigering | Separata text- och bildfält. Ingen fri redigering av layout eller typografi. |
| Format | Alltid en enda stående A4. Mallen styr all form. |
| Innehåll | Sparas separat från mall och export-PDF. Blad kan dupliceras. |
| Skolinformation | Kontaktuppgifter hämtas från vald skola och kan ändras per blad. Standard och avvikelser hålls separata. |
| Förvaltning | Gemensamt bibliotek med behörighetsfiltrerad åtkomst, sparning och versionshistorik. |
| Utdata | A4-förhandsvisning och verklig PDF-export. |
| Samtidighet | En redaktör åt gången per blad; flera blad kan redigeras parallellt. |
| Redigeringslås | Atomiskt databaslås, förnyelse under redigering, utgång efter frånkoppling. Sparning kontrollerar lås och version. |

”Gemensamt bibliotek” betyder en gemensam funktion. Skolredaktörer får inte därigenom läsa andra skolors blad. Central administration kan överblicka alla skolor.

## 2. Föreslaget arbetsflöde

1. Välj en skola som du har åtkomst till och välj mall.
2. Skapa nytt blad eller duplicera ett befintligt behörigt blad.
3. Ta redigeringslås. Andra kan läsa bladet men får tydlig information om att det redigeras.
4. Ändra separata textfält och välj bild. Skolans kontaktuppgifter visas med tydlig markering av eventuella bladavvikelser.
5. Kontrollera förhandsvisning och eventuellt överfullt innehåll.
6. Spara atomiskt som ny bladversion. Visa sparstatus och undvik att kvittera ett nätverksfel som sparat.
7. Exportera den sparade, identifierade versionen till PDF. Återöppna eller återställ en tidigare version vid behov.

Föreslagen regel: export använder alltid en sparad version. Osparade ändringar måste sparas eller uttryckligen lämnas utanför exporten. Automatisk sparning kontra manuell sparknapp är en detalj att besluta under redigerarprovet.

## 3. Roller och åtkomst

| Handling | Skolredaktör | Central administratör |
|---|---|---|
| Lista/läsa blad, historik och tillhörande privata filer | Egna medlemskapsskolor | Alla skolor |
| Skapa, ändra, duplicera, återställa och exportera | Egna medlemskapsskolor | Alla skolor |
| Använda publicerade gemensamma mallar | Ja | Ja |
| Hantera gemensamma mallar | Nej | Ja |
| Skolornas egna bilduppladdningar | Öppen fråga | Mediaförvaltning behöver preciseras |
| Hantera skolstandard, användare och medlemskap | Ej fastställt | Föreslås central funktion, måste beslutas |
| Godkänna och skicka vidare | Öppen fråga | Öppen fråga |

Läs/skriv kontrolleras med aktuellt medlemskap eller skyddad central roll för varje operation. Anonym åtkomst nekas till blad och privata filer. Användarhanteringens bootstrap behöver ett administrativt upplägg i steg 2; inga roller delas ut i detta paket.

## 4. Föreslagen datamodell

Detta är en modell att implementera och granska i steg 2, inte färdiga SQL-migrationer.

| Objekt | Föreslagna fält och samband |
|---|---|
| `schools` | `id`, namn, kontaktstandard som strukturerade fält, `contact_revision`, tidsstämplar. |
| `school_memberships` | `user_id` → Auth, `school_id` → skola, skolroll; unik kombination användare/skola. |
| `central_roles` | `user_id`, roll; skyddad tabell för central administration. |
| `templates` | Mallidentitet, namn, förvaltningsstatus. Gemensam åtkomst för användning. |
| `template_versions` | Mall-id, versionsnummer, versionsbundet fältschema, designparametrar, renderarversion och font-/resursreferenser. Publicerade versioner är oföränderliga. |
| `sheets` | Blad-id, `school_id`, titel, aktuell `template_version_id`, aktuellt innehåll, kontaktavvikelser, löpande `revision`, skapare/ändrare, tidsstämplar. |
| `sheet_versions` | Blad-id, revision, innehållssnapshot, exakt mallversion, lösta kontaktuppgifter plus standardrevision och avvikelser, stabila media-id, ändrare och tid. Unik blad/revision. Oföränderlig historik. |
| `media` | Id, privat bucket/object key, ägarskola eller uttryckligt central gemensam resurs, MIME-typ, storlek, dimensioner, checksumma, källa/användningsrätt. |
| `editing_locks` | Unikt blad-id, användare, redigeringssession, slumpmässig låstoken, `expires_at`, förnyelsetid. |
| `exports` | Bladversions-id, mall-/renderarversion, privat PDF-referens, checksumma, skapare och tid; utdata hålls separat från redigerardata. |

Databasconstraints säkrar relationer och unikhet. Skolan för ett blad får inte ändras genom godtycklig klientskrivning. Media måste tillhöra samma skola eller ett uttryckligt gemensamt bibliotek. Korsvis duplicering till en annan skola kräver åtkomst till båda skolorna och en medveten regel för media/kontaktuppgifter; föreslaget MVP-beteende är duplicering inom vald skola.

Historiken måste bevara resurser, inte bara länkar. Ersätt inte bildobjekt på samma object key; skapa nytt media-id. Ta inte bort media, mallversioner eller fontresurser som historik refererar till. Bestäm retention och radering innan raderingsfunktion införs.

## 5. Kontaktstandard och bladavvikelser

Godkänt är automatisk skolinformation med ändring per blad. Följande semantik föreslås för tydligt beteende:

- Frånvaro av avvikelse betyder ”följ skolans standard”. Ett uttryckligt tomt värde betyder ”visa inte detta värde”. UI ska skilja dessa tillstånd.
- Visa ”Från skolan” eller ”Ändrat på detta blad” per kontaktfält. ”Återställ till skolans uppgift” tar bort avvikelsen.
- Aktuellt blad använder aktuell standard plus avvikelser. En sparad historisk version fryser de faktiskt visade uppgifterna så att den kan återskapas även när skolan senare ändras.
- Export från sparad version använder dess snapshot. Om aktuell skolstandard har ändrats sedan sparning, visa skillnaden och begär ny sparning för att exportera de nya uppgifterna.
- Duplicering inom samma skola föreslås behålla avvikelser och koppla till aktuell skolstandard; användaren ska se avvikelserna.

Bekräfta denna semantik vid redigerarprovet. Det är inte ett redan beslutat val mellan automatiskt uppdaterade och frysta aktuella blad.

## 6. Redigeringslås, sparning och återställning

Godkänt: låset tas atomiskt i Postgres och förnyas under redigering. Föreslagna provvärden: 120 sekunders livslängd och heartbeat var 30:e sekund. Dessa värden är inte produktbeslut; mät behovet och fastställ i steg 2. Databasens tid avgör giltighet.

Låstagning använder en transaktion med unik bladnyckel och villkor för ledigt/utgånget lås. Vid två samtidiga försök lyckas exakt ett. Separata fönster/sessioner har olika session-id även för samma användare. Förnyelse/frigivning kräver rätt användare, session och låstoken; en sen förnyelse får inte återuppliva ett förlorat lås. Ett eventuellt centralt övertagande är inte beslutat.

Sparning skickar blad-id, låstoken, förväntad revision och validerat innehåll. I samma databastransaktion kontrolleras aktuell åtkomst, rätt session, giltigt lås och revision; därefter skapas historik och bladets revision ökas. Låsraden och bladet hålls låsta till commit så att ett låsbyte inte kan ske mellan kontroll och skrivning. Direkt klientuppdatering av blad eller historik ska vara förbjuden om den kan kringgå transaktionen.

Använd en transaktionsfunktion eller motsvarande backendflöde. RLS och SQL-privilegier ska tillsammans garantera att alla skrivvägar går genom kontrollen. Eventuell privilegierad databasfunktion kräver explicit identitetskontroll, begränsad exekveringsrätt och säkrad search_path; ge inte breda undantag från RLS för att få provet att fungera. [PostgreSQLs radlås](https://www.postgresql.org/docs/current/sql-select.html) är en teknisk grund, medan appens låsprotokoll är ett projektförslag.

Förlorat lås: stoppa server­skrivning och visa ”Redigeringslåset har gått ut. Dina osparade ändringar finns kvar här.” Bevara osparat innehåll för jämförelse/kopiering. Vid versionskonflikt: skriv inte över serverversionen; erbjud att läsa senaste version och jämföra. Frigivning vid stängning är bästa försök, utgången är garantin vid frånkoppling. Lås på blad A hindrar inte arbete på blad B.

Återställning kräver samma behörighet, lås och revisionskontroll som vanlig sparning. Den skapar en ny version av tidigare innehåll/mall/media/kontaktsnapshot och raderar inte historik. Samtidig redigering senare kräver separat konflikthantering och synkdesign; den kan inte införas genom att bara ta bort låset.

## 7. Tekniska gränser

Behörighet ska ligga i RLS och Storage-policyer samt serverkontroller, inte bara i UI. Frontend använder publik/publishable Supabase-nyckel med RLS; serverhemligheter exponeras aldrig. [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage-åtkomst](https://supabase.com/docs/guides/storage/security/access-control) och [Next.js miljövariabler](https://nextjs.org/docs/app/guides/environment-variables) beskriver plattformsmekanismerna; skolmodellen ovan är appens egen policy.

Privata bilder/PDF:er läses med auktoriserad åtkomst eller kortlivade signerade länkar. För skoluppladdningar, om de godkänns, rekommenderas direktuppladdning till Supabase Storage efter åtkomstkontroll, med typ-, storleks- och dimensionsvalidering. Detta undviker att bildfiler måste passera en Vercel-function. [Supabase upload](https://supabase.com/docs/guides/storage/uploads/standard-uploads) och [privata nedladdningar](https://supabase.com/docs/guides/storage/serving/downloads).

SSR-inloggning ska använda den aktuella officiella Supabase-guiden, verifierad identitet och skydd mot delad cache av sessionssvar. Medlemskap och central roll kontrolleras separat. [Supabase SSR för Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).

PDF-generering ska provas i den faktiska Vercel-miljön innan den sägs fungera där. Runtime, fontladdning, Chromium/PDF-bibliotek, minne, starttid, tidsgräns och filstorlek måste bedömas tillsammans. Varaktig lagring sker i Storage. [Vercel Functions begränsningar](https://vercel.com/docs/functions/limitations). DEV och produktion separeras när externa resurser senare beställs.

## 8. Förslag, öppna frågor och utanför MVP

| Status | Fråga |
|---|---|
| Förslag, ej bekräftat | Markera överfull text och neka export tills redaktören kortat texten. Ingen automatisk textkapning eller typografisk krympning. |
| Öppen fråga | Ska skolor få ladda upp egna bilder? Vilka filtyper, rättigheter och granskningsregler gäller då? |
| Öppen fråga | Vem godkänner, vilka mottagare finns och vad betyder ”skicka vidare”: status, nedladdning, intern delning eller externt skick? |
| Tekniska förslag | Kontaktsemantik, låstider, sparbeteende, dupliceringsdetaljer, biblioteksfilter och administrativ användarhantering enligt ovan. |
| Resurser att fastställa | Originalbilder, fullständiga fontfiler, användningsrätt och exakta designmått. |
| Senare | Avdelningar, samtidig redigering och automatisk konvertering av godtyckliga Illustrator-PDF:er. |

Inga automatiska meddelanden ska skickas. Godkännande får inte behandlas som färdigbeställt externt sändflöde.
