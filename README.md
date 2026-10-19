# Produktblad – gemensamt skolbibliotek

**Ta bort blad** flyttar blad till en återställningsbar skräpkorg efter bekräftelse. Admin kan ta bort skolornas blad; användare kan ta bort egna nyskapade blad och kopior. Admin återställer under **Administration → Skräpkorg**. Migration 008 är aktiverad i `studio_dev` och `studio` den 19 oktober 2026; se [borttagning, behörigheter och aktivering](docs/SKRAPKORG.md).

**Nytt produktblad** låter användare lägga till utbildningar med eget namn, **Komvux, AF eller AF RUB**, och välja bland sina skolor. Admin följer skapare, datum och skolor under **Administration → Tillagda produktblad**. Migration 007 är aktiverad i `studio_dev` och `studio` den 19 oktober 2026. Se [nya produktblad, behörigheter och verifiering](docs/NYA-PRODUKTBLAD.md).

Gränssnittet använder Astar Studios profil `/platform/v3/`: gemensam vänstermeny, varmvit bakgrund, rosa accenter och rundade kontroller. Biblioteket har en detaljpanel för valt blad, redigeraren visar innehållsfälten till höger och Bildbank finns på `/images`. A4-mallarnas typografi är separat. Publicera portalens v3-resurser före denna appversion.

**Skapa textförslag** söker automatiskt på astar.se efter bladets utbildning, skola och utbildningstyp. Vid en entydig träff hämtas underlaget och Astar Studios AI skapar ett förslag; annars får du välja bland föreslagna sidor. Granska källan och förslaget innan **Använd text**. Egen länk och manuellt underlag finns som reserv. Se [AI-textförslag](docs/AI-TEXTFORSLAG.md).

Produktblad körs på Vercel med Neon Postgres i Frankfurt. Blad, privata bilder, inloggning, skolmedlemskap, redigeringslås och versionshistorik sparas i databasen. Preview och A4-export använder samma bladkomponent och en sparad, fryst version.

Öppna https://produktblad.vercel.app och logga in via Astar Studio. En befintlig portalsession används utan extra lösenord i Produktblad. Behörig administratör kan nu bjuda in, välja Produktblad-roll och skolor och koppla befintliga konton från portalens administration. Appåtkomst eller portal-adminroll ger inga lokala skolor/adminrättigheter automatiskt. Befintliga konton, roller och blad bevaras. Ingen e-post skickas automatiskt. Se [PORTAL-SSO.md](docs/PORTAL-SSO.md) och [behörighetshantering i portalen](docs/PORTAL-BEHORIGHETER.md).

**Spara utkast** sparar gemensamt. **Versionshistorik** låter dig läsa in en äldre version och spara den som en ny. Endast en redigeringssession åt gången kan spara ett blad. Låset förnyas var 30:e sekund och löper ut efter 120 sekunder. Om låset förloras behålls osparade ändringar i det öppna fönstret.

Tidigare lokala utkast och bilder flyttas inte automatiskt från andra datorer. Öppna den gamla webbläsaren på samma adress och använd **Importera mina lokala utkast** i biblioteket respektive bildbibliotekets importknapp. Befintliga molnutkast skrivs inte över av importen. Besöksadresser fylls i från användarens kontrollerade lista den 10 oktober 2026. Manuella bladadresser bevaras. Se docs/BESOKSADRESSER.md. Övriga skolkontakter fylls inte i automatiskt.

## Utveckling

```powershell
npm ci
npm run dev
```

Lokal utveckling kräver `.env.local` med `APP_DATABASE_URL`, `BETTER_AUTH_SECRET` och `BETTER_AUTH_URL=http://localhost:3000`. Använd aldrig produktionsdatabasen i lokal utveckling. Se [Neon-installation och drift](docs/NEON.md) för migrationer, konton och miljöer.

```powershell
npm run lint
npm run typecheck
npm run build
```

På Windows använder PDF-exporten installerad Chrome/Edge eller `PDF_BROWSER_PATH`. På Vercel används paketerad Chromium. Export kräver en giltig QR-adress och att texten ryms inom den fasta A4-mallen.

## Historik: lokal prototyp före Neon-anslutningen

Texten nedan beskriver tidigare steg och deras dåvarande begränsningar. Den aktuella molnfunktionen beskrivs ovan och i NEON.md.

# Produktbladsapp – lokal prototyp av Kock-mallen

En körbar svensk redigerare för ett stående A4-produktblad med ett lokalt skolbibliotek. Grunden är **steg 1** i [byggplanen](docs/BYGGPLAN.md): Kock-mall, separata text- och bildfält, lokal utkastssparning, förhandsvisning, varning vid överfull text och verklig PDF-export. Skolbiblioteket beställdes som en lokal utökning den 8 oktober 2026. Steg 2 med databas och behörigheter är fortfarande pausat.

Projektmappen är mappen som innehåller denna README, `package.json`, `app/` och `references/Kock.pdf`. Öppna just den mappen med **Arkiv → Öppna mapp** i VS Code.

## Starta lokalt

Node.js 24.19.0 användes vid utvecklingen. En aktuell Node-version som uppfyller [Next.js krav](https://nextjs.org/docs/app/getting-started/installation) behövs. Öppna terminalen i projektmappen och kör:

```powershell
npm ci
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000). PDF-exporten startar en lokalt installerad Chrome eller Edge. På denna dator hittades Chrome under `C:/Program Files/Google/Chrome/Application/chrome.exe`. Om din webbläsare ligger på annan plats, ange den innan du startar appen:

```powershell
$env:PDF_BROWSER_PATH = 'C:/sökväg/till/chrome.exe'
npm run dev
```

Du kan redigera text under **Omslag**, **Utbildning** och **Kontakt**, och byta huvudbild via en lokal JPG-, PNG- eller WebP-fil under 2 MB. **Spara utkast** använder webbläsarens lokala lagring på den datorn; det är ännu ingen gemensam databas eller versionshistorik. **Ladda ner PDF** sparar utkastet lokalt och laddar ned en PDF med skola och utbildning i filnamnet. Exempelbladet heter `produktblad-kock-exempel.pdf`.

## Skolornas produktblad

Startsidan och `/produktblad` visar 136 poster för 24 skolor från användarens lista. Välj skola eller **Alla produktblad**, och sök på utbildning, skola eller utbildningsform. Exakta dubbletter efter trimning av inledande/avslutande blanksteg har slagits ihop; olika utbildningsnamn och utbildningsformer hålls separata.

Filtrera även på utbildningsform och **Alla**, **Sparade**, **Ej påbörjade** eller **Tidigare mall**. Siffrorna i snabbfiltren gäller den aktuella sökningen och skol-/utbildningsformsvalet. Filtervalen behålls i `sessionStorage` under samma browserflik när du återvänder från redigeraren. **Rensa filter** och tomlägets **Visa alla produktblad** återgår till hela biblioteket. Hela produktkortet är klickbart och har en namngiven länk för tangentbordsnavigation. Översikten över skolor, blad och sparade utkast gäller hela biblioteket.

**Skapa produktblad** öppnar rätt skola och utbildning i dess A4-mall. **Fortsätt redigera** öppnar ett sparat eller tidigare utkast. Komvux har referenstext med `***` för yrkesspecifika uppgifter; AF och AF RUB har sin referenstext med `****`. Alla blad har standardtexten om Astar längst ner. Utbildningens Bild 1 används automatiskt när bladet saknar ett eget sparat bildval. Inga utbildningsspecifika fakta eller personkontakter har hämtats automatiskt.

Efter **Spara utkast** visas en grön markering med **Sparat utkast** i biblioteket. Den gäller enbart kombinationen skola, utbildningsform, utbildning och aktuell mallversion. Den visar att något sparats, inte att bladet är komplett eller godkänt. Sparning i en skola markerar inte motsvarande utbildning i en annan skola. **Återställ standardinnehåll**, under **Om mallen & fler alternativ**, tar bort den sparade versionen och dess gröna markering.

**Ctrl+S / ⌘S** sparar det öppna utkastet. Redigeraren visar osparat/sparat läge och varnar vid omladdning, stängning eller sin länk tillbaka till biblioteket när ändringar är osparade. Inget autosparande har införts. Browsern bestämmer om och hur en varning vid stängning visas.

Utkast och markeringar finns bara i samma webbläsare och på samma origin (värd och port). Biblioteket är ingen åtkomstkontroll. Kock-exempelbladet finns via **Öppna Kock-mallens exempelblad** (`/?exempel=1`) och kopplas inte automatiskt till en skola. Underlaget finns i `fixtures/produktblad.json`.

## Etikett, innehållsrubriker och standardtext

**Övre etikett** är en rullista med **KOMVUX**, **ARBETSMARKNADSUTBILDNING** och **PRAKTISK UTBILDNING / MED STORA MÖJLIGHETER TILL JOBB**. Det tredje valet visas på två rader på bladet, med radbrytning efter UTBILDNING. Nya skolblad börjar med KOMVUX för Komvux-poster, annars ARBETSMARKNADSUTBILDNING för AF/AF RUB. Du kan själv byta valet; det sparas med innehållet och används även i PDF-exporten.

Under **Utbildning** öppnar du ett textavsnitt i taget. Varje avsnitt har ett separat rubrikfält och textfält. Klicka på den runda **↺**-knappen bredvid ett fält för att återställa dess standardtext för aktuellt program. Knappen ändrar bara det fältet; spara sedan utkastet. Kock-exempelbladet återställs till sin tydligt märkta exempeltext. **Kontakt** grupperar skoluppgifter, två kontaktpersoner och QR-adress i egna avsnitt. ”Innehåll finns” betyder bara att text finns i avsnittet, inte att informationen är komplett.

Komvuxtexterna för alla 104 Komvuxposter definieras i `KOMVUX_REFERENCE_CONTENT` i `lib/komvux-default-content.ts`, enligt användarens `produktblad-kock-exempel (11).pdf`. Nya och osparade blad får text med `***` för yrke, arbetsuppgifter, veckor, praktikandel, omfattning, poäng och kontaktuppgifter. Tomma fält kompletteras även vid återöppning och äldre lokal utkastimport. Exakt matchande äldre standardtext för upplägg/utbildningsform på osparade blad ersätts så att 15 %, 50 veckor och 1 200 poäng inte blir generella fakta. Egna texter och sparade blad behålls. Ett byte av övre etikett skriver inte över innehållet. Layout, mallversion och lagringsnycklar är oförändrade. Se [KOMVUX-STANDARDTEXT.md](docs/KOMVUX-STANDARDTEXT.md) för beteende och verifiering.

Det nya fältschemat hör till mall `kock-1.1.0-prototyp`. Äldre utkast från `kock-1.0.2-prototyp` och den ursprungliga Kock-prototypen läses in med standardrubriker och en etikett utifrån utbildningsformen. Appen meddelar att utkastet behöver sparas i den nya mallen. Den äldre sparningen skrivs inte över. Biblioteket visar **Tidigare mall** tills bladet sparats för aktuell mall; därefter blir markeringen grön. Återställning av hela bladet återupplivar inte ett äldre utkast.

## Bildgradient

Under **Omslag → Gradient över bilden** väljer du **Ingen**, **Vit** eller **Mörkblå**. Båda färgerna har fyra styrkor: **1 Lätt**, **2 Mjuk**, **3 Tydlig** och **4 Stark**. Gradientens opacitet vid vänsterkanten är 25, 45, 65 respektive 85 procent och tonas till transparent åt höger. Texten ligger ovanpå gradienten. Mörkblått ger vit etikett, rubrik och ingress; yrkesordet behåller korallfärgen. **Ingen** är standard och återger det tidigare utseendet.

Valet sparas med innehållet som `gradientStyle` och `gradientStrength`. Preview och PDF använder samma gradient i den gemensamma bladrenderaren. Mallversionen är nu `kock-1.2.0-prototyp`. Utkast från 1.1.0 läses in med bevarade rubriker, texter, etikett och bild, utan gradient; spara för att behålla dem i den nya mallen. Äldre sparningar finns kvar och skrivs inte över. Biblioteket visar **Tidigare mall** tills aktuell mall sparas och blir grön. Tidigare återställningar respekteras så att äldre snapshots inte återkommer oavsiktligt.

## Fast förhandsvisning och zoom

På desktop ryms redigeraren i browserfönstret. Vänstersidans fält scrollas separat, medan förhandsvisningen ligger kvar på högersidan. **Anpassa** är standard och anpassar bladet efter både tillgänglig bredd och höjd, även när fönstret ändras.

Zoomkontrollerna ligger i en flytande horisontell list under bladet, enligt den nya bildreferensen. Knappen med expansionspilar döljer redigeraren och ger preview mer bredd; samma knapp tar tillbaka redigeraren. Använd **+**, **−** eller **100 %** för att granska detaljer. Förstorade blad scrollas inom förhandsvisningen; **Anpassa** återgår till hela sidan och nollställer scrollningen. Zoom ändrar bara visningen, inte mallens typografi, radbrytningar, PDF-storlek eller kontrollen av överfullt innehåll. På mobil växlar du mellan **Redigera** och **Förhandsvisa** i samma arbetsyta. Previewns geometri mäts även när den är dold på mobil, så utrymmeskontrollen fortsätter fungera.

Klicka på en text eller bild i preview för att öppna motsvarande redigeringsdel och fokusera fältet. Samma fält nås med tangentbord via redigerarens flikar och avsnitt. En överfullhetsvarning har en länk till första berörda fältet; andra berörda avsnitt markeras. Saknad QR-adress eller adress utan `http://`/`https://` upptäcks före export, enligt PDF-routens befintliga regel. Utkast kan fortfarande sparas. Inga nya krav på ifyllda utbildningstexter eller kontaktpersoner har införts.

Överfull text markeras och spärrar PDF-export. Detta är en teknisk provregel, ännu inte ett bekräftat produktbeslut. Text krymps eller kapas inte automatiskt. Förhandsvisningen och exporten bygger på samma bladkomponent, och servern kontrollerar även utrymmet när en PDF begärs direkt.

## Gränssnittets visuella tema

Gränssnittet följer användarens bildreferens: marinblå sidomeny, vit toppbar och redigerare, varm ljusgrå previewyta samt korallfärgade primärknappar. Spara utkast och Ladda ner PDF ligger i toppbaren. Sparade utkast behåller sin gröna markering. Inter används för kontroller och Lora för större gränssnittsrubriker. Sidomenyn använder den stående Astar Studio-loggan `public/astar-studio-logo-staende.png`, vit via CSS-filter och utan box. Produktbladet använder fortsatt `public/logo_liggande.png` i originalfärger.

Bibliotek öppnar skolornas blad. Mallar öppnar den befintliga Mall 01 med exempeldata. Inställningar öppnar bildbibliotekets uppladdning och översikt i en tangentbordstillgänglig dialog; information om lokal sparning och återställning finns längst ner. Länkar ut från redigeraren varnar vid osparade ändringar. På mobil blir sidomenyn en kompakt toppmeny. Produktbladets fasta layout är oförändrad; denna uppdatering gäller appens arbetsyta.

Temat definieras i `app/globals.css` och är separat från A4-mallens `app/sheet.css`. UI-färgvariablerna styr inte produktbladets form.

## Kontroller och projektfiler

```powershell
npm run typecheck
npm run lint
npm run build
```

- [Projektspecifikation](docs/PROJEKTSPECIFIKATION.md): godkända beslut, föreslagen datamodell och öppna frågor.
- [Designregler](docs/DESIGNREGLER.md) och [mätning av referensen](docs/REFERENSMATT.md): fast A4-form, mått och avvikelser.
- [Byggplan](docs/BYGGPLAN.md) och [verifiering av steg 1](docs/VERIFIERING.md): vad som är provat och vad som återstår.
- [AGENTS.md](AGENTS.md): instruktioner för fortsatt arbete med Codex.
- [UX-förslag](docs/UX-FORSLAG.md): prioriterade förbättringsidéer, ännu inte godkända produktbeslut.
- [Kock.pdf](references/Kock.pdf): oförändrad originalreferens. `public/reference-hero.jpg` är dess inbäddade foto utlyft till den lokala prototypen.
- `public/fonts/`: lokala Inter- och Lora-filer med respektive licenstext. Referens-PDF:ens delmängdsfonter har inte återanvänts som appfont.
- `public/logo_liggande.png`: gemensam standardlogga för sidans header, browserikon, produktbladets förhandsvisning och PDF-export. Bilden behåller sina proportioner. Headerns loggyta styrs av `app/globals.css`; produktbladets placering och storlek styrs av mallen i `app/sheet.css`.

## Fortsättning

Steg 2 enligt byggplanen gäller Supabase Postgres, Auth, privata filer, skolbehörigheter, historik och atomiska redigeringslås. Det är inte byggt ännu. Vercel-miljöns PDF-generering behöver ett eget verkligt prov innan den kan sägas fungera där. Användarens beslut om egna bilduppladdningar, overflow-regel och godkännandeprocess är fortfarande öppna.

För fortsatt arbete i Codex: öppna projektmappen, be Codex läsa `AGENTS.md`, `docs/PROJEKTSPECIFIKATION.md`, `docs/BYGGPLAN.md` och `docs/VERIFIERING.md`, och ange vilket avgränsat steg som ska byggas.

## Standardtext om Astar

Alla nya blad har användarens standardtext i Om Astar längst ner, direkt efter det fasta fetstilta ordet Astar. Texten definieras i DEFAULT_ABOUT i lib/sheet.ts och används av Komvux, AF, AF RUB och exempelbladet. Befintliga sparade fält bevaras. Under Kontakt kan du använda ↺ vid Om Astar för att lägga in standardtexten i ett befintligt blad. Texten är fortsatt redigerbar och följer med i PDF-exporten.


## Rubrik med två eller tre rader

Under Omslag väljer du Rubrikens layout: två rader med 53,18 pt eller upp till tre rader med fast 42 pt. Treradsläget bryter yrkesnamnet automatiskt vid ordgränser. Enter i Yrke ger en egen radbrytning. Rubrikens bredd, placering och radavstånd är mallstyrda. Text som kräver fler rader eller kolliderar med ingressen markeras och blockerar export; text kapas inte.

Textfärg väljs separat för första raden, inledande ord och yrkesnamn: Blå, Korall eller Automatisk. Automatisk är blå på vanlig/vit bild och vit med mörkblå gradient. Ett uttryckligt färgval gäller även över mörkblå gradient. Standard är automatisk färg för de två första delarna och korall för yrket.

Mallversion `kock-1.3.0-prototyp` sparar layout och färger med innehållet. Tidigare 1.2-utkast läses in med två rader och tidigare färgbeteende; originalsparningen finns kvar. Spara i den nya versionen för aktuell grön markering. Preview och PDF använder samma rubrikrenderare.


## Bildbibliotek per utbildning

Alla 86 utbildningsnamn i katalogen har **Bild 1** och **Bild 2** från användarens zip-fil: 106 originalbilder för 53 yrkesinriktningar. Namnvarianter som Kock och Kock AF använder samma förinställda bildpar. [Kopplingstabellen](docs/HERO-KOPPLINGAR.md) visar varje utbildning. Bilderna finns i `public/education-heroes/` och kopplas genom `fixtures/education-images.json`; de laddas när de visas eller väljs.

Under **Omslag → Välj från bildbiblioteket** är bladets utbildning automatiskt vald. Välj Bild 1 eller Bild 2 och klicka **Använd bild … på bladet**. Bildvalet sparas med **Spara utkast**. Befintliga sparade blad byter inte bild automatiskt. Namnvarianterna har separata platser för eventuella egna ersättningsbilder.

**Inställningar → Bildbibliotek** visar båda bilderna och 2/2 för varje utbildning. Central administration kan ersätta en bild med JPG, PNG eller WebP under 2 MB. Gemensamma uppladdningar i Neon går före förinställda bilder och bevaras. **Återställ förinställd bild** tar bort en uppladdad ersättningskoppling med bekräftelse, varefter originalbilden blir tillgänglig igen. Redan sparade blad behåller sina bilder. De förinställda originalbilderna ingår i appen och tas inte bort via gränssnittet.

Vid val av en förinställd bild kopieras JPEG-data till bladet. Den befintliga serversparningen skapar sedan privat media och fryser mediereferensen med bladversionen. Befintliga privata biblioteksbilder använder fortsatt `/api/media/…` och befintliga åtkomstkontroller. Preview och PDF använder samma frysta innehåll. Import av tidigare lokala bilder bevarar befintliga gemensamma uppladdningar, men kan ersätta en förinställd bild.

Bildvalets hämtning använder `appPath`, precis som miniatyrbilden, så att **Använd bild 1/2** även fungerar när appen ligger under `/produktblad`. Kör `node scripts/test-image-picker.mjs` för ett isolerat Chrome-prov av den riktiga bildväljaren på både rotadress och portalsökväg. Provet använder riktiga JPEG-filer och simulerat biblioteks-API; det kontrollerar bildval, avkodning, bevarat val vid hämtningsfel och oförändrade privata mediereferenser. Det verifierar inte sparning mot Neon, exporterad PDF eller faktisk Vercel-miljö.

Ingen databasmigration eller ny molnresurs behövs för dessa förinställda bilder. Denna ändring har inte manuellt publicerats till Vercel och har inte verifierats med en inloggad session i den faktiska molnmiljön.

### Automatiskt bildval, 12 oktober 2026

Alla 136 nya blad får utbildningens **Bild 1** från det gemensamma biblioteket. Även tidigare öppnade, osparade blad med tom bild eller den gamla exempelbilden får Bild 1. Om admin har ersatt plats 1 i biblioteket används den uppladdade privata bilden. Ett befintligt eget bildval, exempelvis Bild 2 eller en direktuppladdning, bevaras även i ett äldre lokalt utkast. Sparade blad och frysta historiska versioner ändras inte. Kock-exempelbladet får Kock Bild 1 när det saknar en sparad version.

Vid sparning kopieras originalbildens bytes till privat media och bildreferensen fryses med versionen. Servern accepterar bara exakta bildvägar i projektets bildmanifest; godtyckliga filvägar får inte läsas. Privata bilder använder samma befintliga skol- och biblioteksåtkomstkontroller. `next.config.ts` inkluderar original-JPEG-filerna i blad-API:ets serverpaket med outputFileTracingIncludes.

Verifiering: `npx tsx scripts/test-default-image.ts` kontrollerar Bild 1 och filer för alla 136 blad samt bevarade bildval. Lokal Postgres/RLS verifierar bibliotekets privata ersättare, exakt JPEG-kopia vid sparning och bevarad historisk bild. Browserprovet verifierar automatiskt bildval även efter lokal utkastimport/återöppning, sparpayload, mobil och A4-export. Lint, TypeScript och build kontrolleras lokalt. Faktisk Vercel/Neon är inte verifierat; ingen manuell publicering eller live-datamigration utförs.
## Adminläge

Logga in på `/login` med användarnamn **admin** och samma lösenord som kontot **jerrymross@gmail.com**. E-postinloggningen finns kvar. `admin` är ett serverstyrt alias till det befintliga kontot; det skapar inget nytt konto och ger ingen ny roll.

Inloggning med aliaset öppnar `/admin`, med ingångar till alla produktblad, inbjudningar och mallen. Bildbiblioteket öppnas via Inställningar. Adminläge finns även i menyn för centrala administratörer. Servern verifierar sessionen och den skyddade centralrollen före åtkomst till adminsidan. Skolredaktörer skickas till biblioteket. En oinloggad användare skickas till inloggningen. Behörighets- och databasreglerna gäller fortsatt på varje underliggande operation.

Tekniskt använder `lib/admin-login.ts` en före-hook i Better Auth 1.7.7, begränsad till `/sign-in/email`, enligt [officiell hook-dokumentation](https://better-auth.com/docs/concepts/hooks). Lösenordskontroll, sessioner, cookies och rate limiting går via den befintliga Better Auth-inloggningen. Ingen databasmigration behövs. `npx tsx scripts/test-admin-login.ts` kör integrationstest med isolerad minnesdatabas.
## Medlemsregister, ändringslogg och inbjudningar

Adminläget visar ett **medlemsregister** med namn, e-post, Admin/Vanlig användare, skolåtkomst och datum då kontot skapades. Sök på namn, e-post eller skola och filtrera på roll. Admin har åtkomst till alla skolor. Ett konto utan skolmedlemskap markeras tydligt.

**Senast ändrade produktblad** visar de 100 senaste sparade versionerna med tidpunkt, produktblad, skola, namn/e-post på personen som sparade och versionsnummer. Klicka på bladets namn för att öppna dess aktuella version. Sök på produktblad/person eller filtrera på skola inom dessa 100 ändringar. Flera ändringar av samma blad visas separat. Osparade ändringar ingår inte. Saknad historisk personuppgift visas som Uppgift saknas. Tider visas i Europe/Stockholm.

**Inbjudningar** visar e-post, tilldelad roll och skolor samt Väntar på svar, Accepterad eller Utgången. Status beräknas mot databastid vid hämtning. Registret visar inga inbjudningstoken eller återanvändbara länkar. Uppdatera översikten hämtar nya uppgifter; inget automatiskt utskick görs.

Under **Bjud in användare** väljer du uttryckligen **Admin** eller **Vanlig användare**. Vanlig användare måste tilldelas minst en skola. Admin får alla skolor. Rollen lagras i inbjudan och tilldelas av den befintliga skyddade acceptfunktionen. Medlemsregistret är en läsvy; att ändra roller eller skolmedlemskap för befintliga konton ingår inte i denna uppdatering.

`/api/admin/overview` kräver en giltig session och kontrollerar centralrollen i samma transaktion som uppgifterna läses. Svaren använder private, no-store. Inbjudningsrouten validerar roll och skolor och kontrollerar rollen igen i skrivtransaktionen. Inga nya tabeller, rättigheter eller migrationer behövs; uppgifterna finns redan i användare, medlemskap, inbjudningar och versionshistorik.

## AF-produktblad: textupplägg enligt Rityta 1.pdf

Alla 32 katalogblad med program **AF** eller **AF RUB** använder en särskild AF-mall. Vänsterspalten innehåller Varför, Det här lär du dig och Så här går det till. Högerspalten innehåller Vem kan söka?, Utbildningsstart, Ekonomisk kompensation och Utbildningsfakta. Kontaktpersonerna ligger under högerspalten; Om Astar, logotyp, skolnamn/adress och QR-kod ligger längst ner.

Utbildningsstart har egna rubrik- och textfält. Befintligt innehåll i Utbildningsform bevaras i Utbildningsfakta. Skriv en faktauppgift per rad; Ort:, Studieform:, Omfattning:, Längd:, APL: och Mål: visas i fet stil. Inga utbildningsfakta från referensen fylls automatiskt i andra blad. Rubriker som redaktören själv ändrat bevaras.

Följdbeställning 12 oktober: oöppnade och osparade AF/AF RUB-blad får PDF-texten som utgångspunkt, med `****` för yrke, arbetsuppgifter och utbildningsspecifika fakta, inklusive poäng. Nya databasposter får texten från början. Tidigare öppnade, osparade blad (revision 0) får standardtext i sina tomma fält vid varje öppning. Även gamla lokala utkast utan sparad version får tomma fält kompletterade. Befintlig text, sparade blad och historik behålls. Återställ standardinnehåll hämtar hela standardtexten när redaktören själv väljer det.

Ett äldre AF-blad visas med det nya upplägget när det öppnas i redigeraren. Spara skapar en ny version med `af-1.0.0-prototyp`. Äldre sparade versioner/exporter behåller standardmallen. Programmet i katalogen styr mallvalet på servern. Komvux och andra program behåller `kock-1.3.0-prototyp`. Ingen datamigration krävs.

Referens, uppmätta mått och lokal verifiering finns i [docs/AF-MALL.md](docs/AF-MALL.md). Kör `npx tsx scripts/test-af-layout.ts` för kontroll av katalogval, innehåll, bakåtkompatibilitet och lokal utkastimport. Preview och PDF använder samma `Sheet`-komponent och overflow-kontroll.

## Adminlås för färdiga produktblad

Adminlås utan PIN är implementerat. Admin sparar bladet, väljer **Lås färdigt produktblad** och använder **Lås upp … → Bekräfta upplåsning** för att öppna redigering igen. Läsning och PDF-export fortsätter för behöriga användare. Funktionen visas först efter aktivering med databasens migration 002. Se [Adminlås och aktivering](docs/ADMINLAS.md).

## Kopior av låsta blad

Alla skolredaktörer kan skapa högst två redigerbara kopior per låst skolblad. Originalet behåller sitt lås. Kopior har egen historik och PDF-export och nås från originalet och biblioteket. Migration 003 är aktiverad i Neon DEV och produktion. Se [Kopior och verifiering](docs/KOPIOR.md).

## Umeås produktblad

De 14 Umeå-utbildningar som har PDF-underlag i användarens produktblad umeå.zip får egna texter och den fasta mallen komvux-umea-1.0.0. Användaren valde att behålla texten exakt och anpassa mallen. AF-bladet och Yrkessvetsare påbyggnad saknar underlag och behåller tidigare innehåll. Se [Matchning, mall och verifiering](docs/UMEA-INNEHALL.md).

## Astar-plattformen

Se [sökvägsrouting, SSO och lokal utveckling](docs/PLATFORM.md).
