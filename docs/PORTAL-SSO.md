# Portalinloggning för Produktblad

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
- Produktionsresultat dokumenteras efter faktisk deployment och end-to-end-test; en lokal build räknas inte som produktionsbevis.

Officiell JWT-källa: [jose jwtVerify](https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md). Next.js cookies och route handlers lästes från den installerade 16.4.0-versionens `node_modules/next/dist/docs/`.
