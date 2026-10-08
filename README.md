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

**Skapa produktblad** öppnar rätt skola och utbildning i den gemensamma A4-mallen. **Fortsätt redigera** öppnar ett sparat eller tidigare utkast. Nya Komvuxblad har användarens förinställda texter för upplägg, utbildningsform, målgrupp och ekonomi. Övriga innehålls- och kontaktfält är tomma; huvudbilden är tills vidare prototypens exempelbild. AF och AF RUB har inga förinställda brödtexter. Långa utbildningsnamn kan behöva kortas i rubrikfältet för att passa mallen. Inga utbildningsfakta eller skolkontakter har hämtats automatiskt.

Efter **Spara utkast** visas en grön markering med **Sparat utkast** i biblioteket. Den gäller enbart kombinationen skola, utbildningsform, utbildning och aktuell mallversion. Den visar att något sparats, inte att bladet är komplett eller godkänt. Sparning i en skola markerar inte motsvarande utbildning i en annan skola. **Återställ standardinnehåll** för Komvux eller **Återställ till tomt blad** för AF/AF RUB, under **Om mallen & fler alternativ**, tar bort den sparade versionen och dess gröna markering.

**Ctrl+S / ⌘S** sparar det öppna utkastet. Redigeraren visar osparat/sparat läge och varnar vid omladdning, stängning eller sin länk tillbaka till biblioteket när ändringar är osparade. Inget autosparande har införts. Browsern bestämmer om och hur en varning vid stängning visas.

Utkast och markeringar finns bara i samma webbläsare och på samma origin (värd och port). Biblioteket är ingen åtkomstkontroll. Kock-exempelbladet finns via **Öppna Kock-mallens exempelblad** (`/?exempel=1`) och kopplas inte automatiskt till en skola. Underlaget finns i `fixtures/produktblad.json`.

## Etikett, innehållsrubriker och standardtext

**Övre etikett** är en rullista med **KOMVUX**, **ARBETSMARKNADSUTBILDNING** och **PRAKTISK UTBILDNING / MED STORA MÖJLIGHETER TILL JOBB**. Det tredje valet visas på två rader på bladet, med radbrytning efter UTBILDNING. Nya skolblad börjar med KOMVUX för Komvux-poster, annars ARBETSMARKNADSUTBILDNING för AF/AF RUB. Du kan själv byta valet; det sparas med innehållet och används även i PDF-exporten.

Under **Utbildning** öppnar du ett textavsnitt i taget. Varje avsnitt har ett separat rubrikfält och textfält. De tidigare rubrikerna används som standard, inklusive punkter och frågetecken. Klicka på den runda **↺**-knappen bredvid ett fält för att återställa dess standardtext. Knappen ändrar bara det fältet; spara sedan utkastet. För Komvux återställs **Så här går det till**, **Utbildningsform**, **Vem kan söka?** och **Ekonomisk kompensation** till användarens texter, beställda 8 oktober 2026. Övriga skolblads brödtexter har tom standard. Kock-exempelbladet återställs till sin tydligt märkta exempeltext. **Kontakt** grupperar skoluppgifter, två kontaktpersoner och QR-adress i egna avsnitt. ”Innehåll finns” betyder bara att text finns i avsnittet, inte att informationen är komplett.

Komvuxtexterna definieras i `KOMVUX_DEFAULT_CONTENT` i `lib/sheet.ts` och används för katalogposter med utbildningsformen **Komvux**. Textens inklistrade radbrytningar behandlas som radbrytningar från originalbladet; mallen bryter styckena efter sin fasta spaltbredd. Befintliga sparade eller äldre utkast ändras inte automatiskt, även om ett sparat fält är tomt. Använd **↺** vid respektive textfält för att hämta den nya standardtexten till ett befintligt utkast. **Återställ standardinnehåll** återställer hela Komvuxbladet och tar bort dess sparmarkering tills bladet sparas igen. Ett byte av övre etikett skriver inte över innehållet. Fältschema, mallversion och lagringsnycklar är oförändrade.

Det nya fältschemat hör till mall `kock-1.1.0-prototyp`. Äldre utkast från `kock-1.0.2-prototyp` och den ursprungliga Kock-prototypen läses in med standardrubriker och en etikett utifrån utbildningsformen. Appen meddelar att utkastet behöver sparas i den nya mallen. Den äldre sparningen skrivs inte över. Biblioteket visar **Tidigare mall** tills bladet sparats för aktuell mall; därefter blir markeringen grön. Återställning av hela bladet återupplivar inte ett äldre utkast.

## Bildgradient

Under **Omslag → Gradient över bilden** väljer du **Ingen**, **Vit** eller **Mörkblå**. Båda färgerna har fyra styrkor: **1 Lätt**, **2 Mjuk**, **3 Tydlig** och **4 Stark**. Gradientens opacitet vid vänsterkanten är 25, 45, 65 respektive 85 procent och tonas till transparent åt höger. Texten ligger ovanpå gradienten. Mörkblått ger vit etikett, rubrik och ingress; yrkesordet behåller korallfärgen. **Ingen** är standard och återger det tidigare utseendet.

Valet sparas med innehållet som `gradientStyle` och `gradientStrength`. Preview och PDF använder samma gradient i den gemensamma bladrenderaren. Mallversionen är nu `kock-1.2.0-prototyp`. Utkast från 1.1.0 läses in med bevarade rubriker, texter, etikett och bild, utan gradient; spara för att behålla dem i den nya mallen. Äldre sparningar finns kvar och skrivs inte över. Biblioteket visar **Tidigare mall** tills aktuell mall sparas och blir grön. Tidigare återställningar respekteras så att äldre snapshots inte återkommer oavsiktligt.

## Fast förhandsvisning och zoom

På desktop ryms redigeraren i browserfönstret. Vänstersidans fält scrollas separat, medan förhandsvisningen ligger kvar på högersidan. **Visa hela bladet** är standard och anpassar bladet efter både tillgänglig bredd och höjd, även när fönstret ändras.

Zoomkontrollerna ligger i en smal list till höger om bladet för att ge förhandsvisningen mer höjd. Använd **+**, **−** eller **100 %** för att granska detaljer. Förstorade blad scrollas inom förhandsvisningen; **Visa hela bladet** återgår till hela sidan och nollställer scrollningen. Zoom ändrar bara visningen, inte mallens typografi, radbrytningar, PDF-storlek eller kontrollen av överfullt innehåll. På mobil växlar du mellan **Redigera** och **Förhandsvisa** i samma arbetsyta. Previewns geometri mäts även när den är dold på mobil, så utrymmeskontrollen fortsätter fungera.

Klicka på en text eller bild i preview för att öppna motsvarande redigeringsdel och fokusera fältet. Samma fält nås med tangentbord via redigerarens flikar och avsnitt. En överfullhetsvarning har en länk till första berörda fältet; andra berörda avsnitt markeras. Saknad QR-adress eller adress utan `http://`/`https://` upptäcks före export, enligt PDF-routens befintliga regel. Utkast kan fortfarande sparas. Inga nya krav på ifyllda utbildningstexter eller kontaktpersoner har införts.

Överfull text markeras och spärrar PDF-export. Detta är en teknisk provregel, ännu inte ett bekräftat produktbeslut. Text krymps eller kapas inte automatiskt. Förhandsvisningen och exporten bygger på samma bladkomponent, och servern kontrollerar även utrymmet när en PDF begärs direkt.

## Gränssnittets visuella tema

Gränssnittet använder en mörk Astar-inspirerad palett med djup marinblå bakgrund (`#111a2d`), blågrå ytor och dämpad korall (`#d98278`) som accent på huvudknappar, aktiva val och fokusmarkeringar. Sparade utkast behåller sin gröna markering. Lokala Inter-filer används för kontroller och brödtext; Lora används för utvalda gränssnittsrubriker. Standardloggan är transparent och visas direkt på toppbarens marinblå bakgrund, utan box eller bakgrund i loggbehållaren. Ett CSS-filter gör gränssnittets logga vit, även på felsidan. Originalbildfilen används fortfarande och ändras inte. Produktbladets logga, färger och fasta malltypografi behålls i preview och PDF.

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
