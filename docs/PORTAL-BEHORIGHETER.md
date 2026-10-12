# Produktblads rättigheter i Astar Studio-portalen

Beställt 12 oktober 2026: hantera appåtkomst, Produktblad-roll, skolor och kontokoppling från portalen. Befintliga roller, skolmedlemskap, blad och versioner migreras inte eller ersätts automatiskt.

## Användning

- Portalen → Administration → Bjud in användare: välj Produktblad och därefter vanlig användare med valda skolor, eller uttryckligen bekräftad Produktblad-admin. En portalinbjudan räcker; ingen andra Produktblad-inbjudan behövs.
- Portalen → Administration → Användare → Hantera: Spara portalåtkomst styr aktivt konto och tillgång till appar. Hantera Produktblads roll och skolor öppnar den aktuella lokala behörigheten; Spara Produktblads rättigheter ändrar den separat och kvitteras först när Produktblad bekräftat transaktionen.
- Portal-admins har en Produktblad-knapp på sin användarrad. Portal-adminrollen och Produktblad-adminrollen är skilda.
- Koppla ett befintligt Produktblad-konto: välj uttryckligen personens befintliga konto och bekräfta personkontrollen. Kontots befintliga rättigheter och blad bevaras. Ingen automatisk e-postmatchning görs. Om en ny tom SSO-identitet redan skapats kan den ersättas med den valda länken; det gamla tomma kontot behålls, och ingen historik raderas. Identiteter med egen åtkomst eller historik kan inte länkas om via denna funktion.
- Produktblads adminvy och sidomeny länkar till portalens administration. Äldre Produktblad-inbjudningar kan fortfarande accepteras; de raderas inte.

Första behöriga administratören är den tidigare uttryckligt verifierade kontolänken för Jerry Ross. En administratör måste både vara aktiv portal-admin och vara länkad till ett lokalt Produktblad-admin-konto. En ny portal-admin får inte därigenom rätt att tilldela skolor eller göra sig själv till Produktblad-admin.

## Serverkontrakt

Portalen anropar endast fasta `https://produktblad.vercel.app/api/portal/management/`-adresser från servern. Ingen CORS eller extra lösenord/delad hemlighet införs. Portalens privata nyckel stannar i portalen.

- `GET directory`: skolor och befintliga konton som ännu inte är länkade.
- `GET user`: aktuell profil för portalens verifierade målidentitet.
- `PUT user`: roll, skol-ID:n, förväntad revisionsversion och explicit adminbekräftelse.
- `POST link`: valt lokalt användar-ID, revisionsversion och explicit personbekräftelse.

Administrations-JWT skiljs från vanlig SSO med exakt audience `produktblad-management`, typ `portal-management+jwt` och scope `produktblad:manage`. Token gäller högst 60 sekunder, innehåller actor-sub, portalsession, jti och target-sub och är bunden med SHA256 till HTTP-metod, fast path och exakt request-body. Vanliga inloggningstoken fungerar inte på dessa endpoints. Token skickas aldrig till browsern eller sparas i loggar.

Produktblad verifierar RS256/JWKS, issuer, audience, typ, scope, tid och request-bindning. Varje anrop kontrolleras levande genom portalens nya `POST /api/sso/management/introspect`, som hämtar aktuellt aktivt konto, adminroll, session, appstatus och den valda målidentiteten från portalens databas. Produktblad kontrollerar dessutom lokal adminroll i samma databastransaktion som ändringen. Nätverksfel nekar operationen.

## Databasskydd och samtidighet

Migration 005 lägger till versionsräknare, förbrukade administrations-jti och en separat ändringslogg. Begränsad runtime-roll får inte skriva central_roles, school_memberships, identitetskopplingar, revisionsrader eller audit direkt. Skrivning sker genom begränsade SECURITY DEFINER-funktioner med explicit schema/pg_temp sist i search_path och kontroll av skyddad lokal adminroll. Skol-ID:n valideras mot skoltabellen. Adminåtkomst kräver uttrycklig bekräftelse; det går inte att ta bort sin egen Produktblad-adminroll.

Behörighetsändringar serialiseras och revisionskontrolleras. Två konkurrerande formulär ger 409 för den gamla versionen, och en förbrukad jti kan inte skriva igen. Audit, roll, skolor och revision sparas atomiskt. Förlorad skolåtkomst tar bort målpersonens redigeringslås för de indragna skolorna. Nästa blad-/PDF-anrop kontrollerar aktuell skolåtkomst genom befintlig RLS.

Portalens appåtkomst och Produktblads roll/skolor ligger i olika databaser. De visas och sparas därför separat för befintliga användare. Vid en ny inbjudan skapas först ett inaktiverat portalkonto. Produktblads valda rättigheter måste bekräftas innan portalens appgrant aktiveras och inbjudningslänk visas. Om det misslyckas finns kontot kvar inaktiverat för kontrollerad återhämtning via Hantera; ingen lyckad inbjudan kvitteras. Det finns ingen distribuerad transaktion och ingen automatisk omsändning av osäkert kvitterade ändringar.

## Miljö och verifiering

Inga nya privata nycklar eller miljövariabler krävs. Befintliga produktionsdomäner, JWKS och databasroller används. Localhost-portalen gör inga administrationsanrop till produktionsdata; separat dev-kontrakt/domän behöver registreras om full lokal SSO-administration senare ska testas.

```powershell
npx tsx scripts/migrate-portal-management.ts dev /privat/.env.owner
npx tsx scripts/migrate-portal-management.ts prod /privat/.env.owner
npx tsx scripts/test-portal-management.ts /privat/miljokatalog dev prod
```

Lokala kryptoprov och DEV SQL-prov är genomförda: metod/body/path-bindning, fel issuer/audience/typ/scope/expiry, tilldelning/indragning, okänd skola, adminbekräftelse, revisionskonflikt, replay, explicit koppling med bevarade roller/skolor, nekad omlänkning och själveskalering. Databasproven återställs med ROLLBACK. Produktions- och browserresultat följer nedan.

### Verifierad produktion 12 oktober 2026

- Produktblad: commit `154779a`, deployment `dpl_5rDamW7DJYTGPrKtm4FnBWV7APw1`, READY på produktionsdomänen.
- Portalen: commit `f174505`, deployment `dpl_FCJ47zZ2QDNcS1bZfHkFXEiPjV4e`, READY på produktionsdomänen.
- Migration 005 tillämpad i studio_dev och studio. Databasproven ovan passerade med båda verkliga runtime-rollerna och återställdes med ROLLBACK.
- `scripts/test-portal-management-production.mjs` passerade mot publicerade HTTPS-endpoints med separata syntetiska portal-admins, en portalinbjuden medlem och ett syntetiskt äldre lokalt konto. Ingen verklig persons lösenord ändrades.
- Riktig Chrome-browser: Administration → Bjud in användare → Produktblad → Vanlig användare → vald skola → en portalinbjudan. Personen aktiverade sitt konto och fick rätt skola direkt via SSO, utan andra Produktblad-inbjudan. Vanlig medlem nekades administrations-API.
- Riktig Chrome-browser: Hantera → Produktblads roll/skolor → välj Admin och bekräfta → Spara. Samma inloggade Produktblad-session blev admin; nedgradering/indragna skolor slog igenom direkt och blad-/PDF-anrop avvisades med 403.
- Explicit kontolänk bevarade det valda äldre kontots skolor. Farlig omlänkning, obekräftad admin, okänd skola och gammal revision nekades.
- Portal-admin utan lokal adminlänk nekades. Ändrad signerad body nekades med 401; återanvänt lyckat administrationsanrop gav 409. Indragen portal-adminroll stoppade redan utfärdat management-token med 401. Självdemotion gav 403.
- Inga JavaScriptfel i portalbrowsern. Inbjudnings- och adminformulär granskades visuellt.
- Efter återställning jämfördes en SHA256-snapshot av alla befintliga blad, bladversioner, skolmedlemskap och centralroller med snapshoten före testet: exakt match. Endast egna syntetiska provkonton och deras länkar/rättigheter/audit återställdes. Ursprungliga kontolänken för Jerry Ross bevarades.

Lokalt: Produktblads typecheck/build/kryptoprov passerade; lint har inga fel och en äldre varning i ignorerade work-filer. Portalens syntax- och konfigurationsprov samt dess SQLite- och isolerade pg/PGlite-browser/SSO-flöden passerade. Windows-testet med flera Chrome-contexts fick 150 sekunders totalbudget; första 60-sekundersförsöken nådde testtimeout under andra navigationen. Lokal portal gör inga administrationsanrop till produktionen. Den faktiska nya integrationens browserprov är produktionsprovet ovan.

Denna uppdatering ändrar ingen mall eller PDF-renderare. Produktionsprovet verifierade att PDF nekas efter skolindragning; en ny lyckad/renderad PDF kördes inte i detta behörighetssteg. Tidigare fungerande SSO/PDF-export är dokumenterad i PORTAL-SSO.md. Databasen är Neon/Postgres med RLS; ingen Supabase-miljö finns i denna implementation.

Tekniska källor: [jose jwtVerify](https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md), [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html). Next.js route handlers lästes i installerade 16.4.0-dokumentationen.
