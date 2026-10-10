# Neon-installation och drift

Beställd 9 oktober 2026: koppla produktblad till Neon och färdigställ hela kopplingen. Detta ersätter den tidigare planens Supabase-val för detta steg.

## Miljöer och hemligheter

Vercel-projekt: `produktblad`. Neon: `produktblad-db`, Free, Frankfurt (`fra1`). Vercel-funktionerna körs i `fra1` via vercel.json. Detta är en teknisk regioninställning, inte en juridisk bedömning av GDPR.

Produktion använder schema `studio` och rollen `studio_app`. Preview/utveckling använder `studio_dev` och `studio_dev_app`. De delar samma Neon-projekt och dess lagringskvot; separationen sker genom databasscheman och separata inloggningar. Detta är inte separata Neon-branches.

`APP_DATABASE_URL` innehåller den begränsade serverrollens anslutning. Rollerna har `NOBYPASSRLS` och kan inte ändra centrala roller eller skolmedlemskap. Identiteten sätts endast inom varje servertransaktion. Bilder finns som privata, oföränderliga medierader, högst 2 MB per bild. När bibliotekets bild byts behålls tidigare bild för versionshistorik.

Vercel Marketplace har även provisionerat ägaranslutningarna DATABASE_URL och DATABASE_URL_UNPOOLED. Appen använder APP_DATABASE_URL. Ägaranslutningen används endast vid administration/migration. Lägg aldrig anslutningar, inbjudningar eller auth-hemligheter i Git eller NEXT_PUBLIC-variabler.

Better Auth 1.7.7 sköter lösenord och sessioner i Neon (egen drift, inte Neon Auth-tjänsten). BETTER_AUTH_SECRET är separat för produktion och utveckling. BETTER_AUTH_URL är produktionsadressen respektive localhost; preview får sin adress från VERCEL_URL. Inbjudningar gäller sju dagar och kan användas en gång. Offentlig signup är avstängd.

## Ny installation

1. Länka rätt Vercel-projekt och provisionera Neon genom Marketplace. Placera ägaranslutningen i den ignorerade `.env.owner`.
2. Kör `npx tsx scripts/provision.ts dev` respektive `prod`. Skriptet skapar Better Auth-tabeller och migrations/001-studio.sql om schemahistoriken saknas, skapar begränsad roll och seedar skol-ID:n från katalogen.
3. Skriptet skriver `.env.dev`/`.env.prod` och en första privat `.invite-dev`/`.invite-prod` om ingen central administratör finns. Ange INITIAL_ADMIN_EMAIL med projektägarens verifierade e-post vid första produktionsinstallationen. Granska värdadressen i provision.ts före installation i ett annat projekt.
4. Lägg APP_DATABASE_URL och BETTER_AUTH_SECRET som Vercel-hemligheter i rätt miljö. För utveckling används motsvarande lokala värden. Kopiera inte produktionsvärden till preview.
5. Bygg, testa och deploya. Öppna `/login?invite=TOKEN` via den privata inbjudan och välj ett eget lösenord på minst tolv tecken.

Provisioneringsskriptet raderar inte befintlig data. Kör framtida SQL-migrationer som nya versionssteg; redigera inte redan tillämpad 001 för att ändra en existerande databas.

## Verifiering

`npx tsx scripts/test-integration.ts` använder localhost och utvecklingsschemat. Testlösenordet måste finnas i ignorerad `.test-password`; skapa ett slumpmässigt testlösenord och motsvarande testinbjudan innan första körningen. Testet rensar endast utvecklingens redigeringslås före körning och skapar syntetiska testkonton/innehåll. TEST_ORIGIN, TEST_EMAIL och TEST_INVITE_FILE kan användas mot en uttryckligen vald testinstallation. Kör inte testet rutinmässigt mot användarnas produktion: det skapar konto, bild och exempelversion.

Kontroller: inloggning/utloggning, stängd registrering, anonym avvisning, sparning/återöppning, konfliktande lås, gammal revision, historik, skolgränser, inbjudningar, privat bildåtkomst och PDF från sparad version. A4-renderaren och referens-PDF:n är bevarade.

Neons Free-kvoter gäller hela projektet; bilder, blad och historik delar lagring. Backup/återställningspolicy och eventuellt byte av plan behöver beslutas efter faktisk användning. Appen innehåller inget automatiskt godkännande- eller utskicksflöde.

Bilduppladdning 10 oktober 2026: nya filer överförs direkt som multipart och lagras binärt i Neon. Uppladdning direkt på bladet är skolskyddad och sker innan Spara utkast; sparningen kopplar därefter filreferensen till en bladversion. Filformatet identifieras från filinnehållet. scripts/test-upload.ts verifierar lagring, privata bildsvar, MIME och storleksgräns.
