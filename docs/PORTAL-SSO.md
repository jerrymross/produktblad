# Portalinloggning för Produktblad

Senare beställning 12 oktober 2026: Produktblad kan också öppnas inuti portalen via en separat verifierad inbäddningsbrygga. Vanlig top-level SSO fungerar fortfarande. Se [PORTAL-INBADDNING.md](PORTAL-INBADDNING.md); nedanstående iframe-gräns beskriver det ursprungliga SSO-steget.

Implementerad 12 oktober 2026 enligt portalens `docs/PROMPT-PRODUKTBLAD-SSO.md`. Detta är portalens specificerade SSO-brygga, inte generell OIDC. Top-level navigering används; iframe är inte aktiverad.

## Protokoll och skydd

`/api/portal/login` skapar 32 slumpbyte vardera för state, PKCE-verifier och transaktionscookie. Serverlagring i Neon gäller högst fem minuter. Cookie och state lagras hashade; verifier lämnar bara servern vid kodutbytet. Callback förbrukar transaktionen atomiskt med DELETE RETURNING, även vid fel state. ReturnTo begränsas till interna relativa adresser.

Fasta serverkonstanter: issuer `https://astar-studio-portal.vercel.app`, klient `produktblad`, callback `https://produktblad.vercel.app/api/portal/callback`. `jose` 6.2.12 verifierar publika JWKS, RS256, exakt at+jwt, issuer, audience, sub, sid, exp, iat, jti och app_id. Ingen privat portalnyckel eller delad portalhemlighet används. Kodutbyte tar JSON utan Origin-header; omdirigeringar och nätverksfel avvisas.

Token lagras endast i `portal_sessions`, knuten till hash av slumpmässig sessionscookie. Cookies är HttpOnly, host-only, Path=/, SameSite=Lax och Secure i produktion. Sessionsutgången är JWT-exp. Varje skyddat anrop verifierar JWT och gör okachad server-introspection. Inaktivt konto, avslutad portalsession, indragen appåtkomst och nätverksfel stoppar åtkomst. Alla befintliga skyddade sidor/API:er/PDF går genom samma `identity`-funktion; RLS och lokala skolroller fortsätter gälla.

Utgången session: sidbesök startar nytt SSO-flöde. API/skrivoperation ger 401 utan HTML eller automatisk omsändning. Redigeraren behåller osparat innehåll och erbjuder inloggning i en ny flik. Därefter kan redigeringslåset tas igen. Produktblad-utloggning är en origin-skyddad POST, raderar server-sessionen och leder till en utloggad vy. Portalutloggning sker separat; introspection stoppar sedan Produktblad.

## Identiteter och skolor

`portal_identities` länkar unikt portal-sub till lokalt användar-ID. Runtime-rollen kan läsa men inte skriva länkar direkt. `portal_new_identity` skapar ett nytt lokalt konto utan roller/skolor om länken saknas. En syntetisk intern adress förhindrar automatisk e-postkoppling och kollision med befintliga lösenordskonton; verifierad portal-e-post används vid inbjudningskontroll och `/api/me`.

Befintliga konton länkas endast administrativt med två oberoende verifierade stabila ID:n genom `scripts/link-portal-account.ts`. E-post är en extra kontroll av det valda lokala kontot, aldrig en automatisk privilegiekoppling. Den 12 oktober godkände användaren uttryckligen länken från portal-kontot `jerry.ross@astar.se` till befintligt Produktblad-konto `jerrymross@gmail.com` (visningsnamn `jerry.ross@astar.se`). Kontots befintliga adminroll, skolmedlemskap och blad behölls. Övriga äldre användare behöver motsvarande kontrollerad länkningsåtgärd för att återfå sina befintliga skolkopplingar via portalen.

Nya användare utan skolkoppling får en neutral vy. Admins befintliga inbjudningar fungerar genom portalinloggning och uttrycklig acceptans: verifierad portal-e-post måste matcha den riktade engångsinbjudan. Endast den av admin valda rollen och skolorna tilldelas. En inbjudan länkar inte ett äldre konto automatiskt. Publik lokal lösenordsinloggning är stängd; gamla Better Auth-sessioner kan inte kringgå portalåtkomst. Befintliga lösenord/konton har inte raderats. Administrativ återställning sker med ägarverktyg, ingen publik reservinloggning har lagts till.

## Drift

Migration 004 är aktiverad i `studio_dev` och `studio`. Kör vid en ny miljö:

```powershell
npx tsx scripts/migrate-portal.ts dev /sökväg/till/.env.owner
npx tsx scripts/migrate-portal.ts prod /sökväg/till/.env.owner
```

Ingen ny miljövariabel krävs för SSO. Befintlig `APP_DATABASE_URL` ska använda rätt begränsad roll; befintliga Better Auth-inställningar behålls för kontodata/administration. Portalens issuer/klient/callback är avsiktligt fasta. Localhost/preview avvisas av login-endpointen tills portalen har en separat uttryckligen registrerad klient/callback; produktionens allowlist utökas inte.

## Verifiering

- Lokalt: `scripts/test-portal-protocol.ts` verifierar RFC-PKCE-vektor, slumpformat, returadresser, signatur, fel issuer/audience/typ/claims, exp/iat och fail-closed introspection.
- Databas DEV/produktion: verkliga runtime-roller i återställda transaktioner; ny identitet saknar admin/skolor och kan inte se blad eller skriva kontolänkar/central roll. Befintliga 28 blad, tre skolmedlemskap och två centralroller räknades före ändringen.
- Lint, typecheck och build körs före push. En befintlig lintvarning i ignorerade `work/verify-neon-copies.mjs` är utanför ändringen.
- Produktion: `dpl_82YU9Fk1ZXGEpCZrd9unhMF5medT`, publicerad från commit `e652ae7` på `https://produktblad.vercel.app`. Vercel nådde READY. Separata syntetiska testidentiteter användes; deras egna konton, inbjudningar, medlemskap och lås återställdes efter provet. Ingen befintlig bladversion skrevs om.

### Faktiska produktionsprov 12 oktober 2026

`scripts/test-portal-production.mjs` passerade hela flödet i Chrome och via de publicerade serveroperationerna:

- Direktbesök → portalens riktiga inloggningsformulär → authorize/callback → HttpOnly/Secure/SameSite=Lax-session. Token fanns endast i serverlagring och sessionsutgången matchade JWT-exp.
- Ny identitet fick neutral vy utan skolor. Vanlig användare nekades admin. Tillfällig portal-adminroll gav ingen lokal adminroll.
- Riktad skol-inbjudan accepterades via verifierad portalidentitet; återanvänd inbjudan avvisades.
- Befintlig sparad bladversion lästes och öppnades i redigeraren. Annan skolas blad och PDF avvisades med 403.
- PDF-export passerade i faktisk Vercel-runtime. Nedladdad fil hade PDF-signatur, en stående A4 (594,96 × 841,92 pt) och fyra inbäddade fontresurser. Export och browser-preview granskades visuellt; referensen Kock.pdf renderades separat. SSO ändrar ingen mallgeometri; befintliga motiv, innehåll och prototypavvikelser består.
- Lokal POST-utloggning ogiltigförklarade den gamla server-sessionen. Ny top-level SSO behövde inget nytt lösenord när portalsessionen fanns; retur till blad-ID med svenska procentkodade tecken fungerade.
- Indragen appåtkomst stoppade redan aktiv Produktblad-session, API-skrivning och PDF med 401. Inaktiverat portalkonto och portalutloggning gav också 401.
- Fel klient och callback (inklusive extra slash), återanvänd kod/callback, fel PKCE-verifier, utgången kod, utgången lokal transaktion, fel state och förbrukad transaktion avvisades. JWT-exp/signatur/issuer/audience/typ och nätverksfel verifierades dessutom i de lokala negativa protokollproven.
- GET-utloggning gav 405, cross-origin POST gav 403, lokal lösenordsinloggning gav 403. Inga browser-JavaScriptfel rapporterades.

Efter återställning fanns fortfarande 28 befintliga blad, tre ursprungliga skolmedlemskap och två centralroller. Den uttryckligt skapade administratörslänken finns kvar.

Lokala browser-SSO-prov kördes inte: localhost/preview saknar registrerad portalcallback. Lokala protokollprov, typecheck, lint (inga fel; en äldre work-varning) och build passerade. PDF-provet ovan är en exporterad produktionsfil, inte en lokal export. Databasskyddet är Neon/Postgres RLS; Supabase används inte.

Kör det skrivande produktionsprovet endast uttryckligen för avsedd miljö:

```powershell
node scripts/test-portal-production.mjs C:/CodeX/Astarstudioportal /katalog/med/produktblads/privata/miljofiler
```

Testet skapar egna syntetiska portal-/Produktblad-konton, accepterar en egen testinbjudan, läser ett befintligt blad och exporterar det. Det provar tillfälligt endast testidentitetens appgrant, kontoaktivitet och portalroll. Privata nycklar kopieras inte till Produktblad. Browserbilder, token/sessionstillstånd och exporterade testfiler ska stanna i ignorerade `work/`.

Officiell JWT-källa: [jose jwtVerify](https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md). Next.js cookies och route handlers lästes från den installerade 16.4.0-versionens `node_modules/next/dist/docs/`.
