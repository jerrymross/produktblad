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

Du kan redigera text i tre flikar och byta huvudbild via en lokal JPG-, PNG- eller WebP-fil under 2 MB. **Spara utkast** använder webbläsarens lokala lagring på den datorn; det är ännu ingen gemensam databas eller versionshistorik. **Exportera PDF** sparar utkastet lokalt och laddar ned `produktblad-kock-prototyp.pdf`.

## Skolornas produktblad

Startsidan och `/produktblad` visar 136 poster för 24 skolor från användarens lista. Välj skola eller **Alla produktblad**, och sök på utbildning, skola eller utbildningsform. Exakta dubbletter efter trimning av inledande/avslutande blanksteg har slagits ihop; olika utbildningsnamn och utbildningsformer hålls separata.

**Skapa blad** öppnar rätt skola och utbildning i den gemensamma A4-mallen. Nytt innehåll och nya kontaktfält är tomma; huvudbilden är tills vidare prototypens exempelbild. Långa utbildningsnamn kan behöva kortas i rubrikfältet för att passa mallen. Inga utbildningsfakta eller skolkontakter har hämtats automatiskt.

Efter **Spara utkast** visas en grön markering med **Sparat produktblad** i biblioteket. Den gäller enbart kombinationen skola, utbildningsform, utbildning och aktuell mallversion. Den visar att något sparats, inte att bladet är komplett eller godkänt. Sparning i en skola markerar inte motsvarande utbildning i en annan skola. **Återställ till tomt blad** tar bort den sparade versionen och dess gröna markering.

Utkast och markeringar finns bara i samma webbläsare och på samma origin (värd och port). Biblioteket är ingen åtkomstkontroll. Äldre Kock-exempelutkast finns via **Öppna Kock-mallens exempelblad** (`/?exempel=1`) och kopplas inte automatiskt till en skola. Underlaget finns i `fixtures/produktblad.json`.

Överfull text markeras och spärrar PDF-export. Detta är en teknisk provregel, ännu inte ett bekräftat produktbeslut. Text krymps eller kapas inte automatiskt. Förhandsvisningen och exporten bygger på samma bladkomponent, och servern kontrollerar även utrymmet när en PDF begärs direkt.

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
- [Kock.pdf](references/Kock.pdf): oförändrad originalreferens. `public/reference-hero.jpg` är dess inbäddade foto utlyft till den lokala prototypen.
- `public/fonts/`: lokala Inter- och Lora-filer med respektive licenstext. Referens-PDF:ens delmängdsfonter har inte återanvänts som appfont.
- `public/logo_liggande.png`: gemensam standardlogga för sidans header, browserikon, produktbladets förhandsvisning och PDF-export. Bilden behåller sina proportioner. Headerns loggyta styrs av `app/globals.css`; produktbladets placering och storlek styrs av mallen i `app/sheet.css`.

## Fortsättning

Steg 2 enligt byggplanen gäller Supabase Postgres, Auth, privata filer, skolbehörigheter, historik och atomiska redigeringslås. Det är inte byggt ännu. Vercel-miljöns PDF-generering behöver ett eget verkligt prov innan den kan sägas fungera där. Användarens beslut om egna bilduppladdningar, overflow-regel och godkännandeprocess är fortfarande öppna.

För fortsatt arbete i Codex: öppna projektmappen, be Codex läsa `AGENTS.md`, `docs/PROJEKTSPECIFIKATION.md`, `docs/BYGGPLAN.md` och `docs/VERIFIERING.md`, och ange vilket avgränsat steg som ska byggas.
