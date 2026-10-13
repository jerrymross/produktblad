# Produktblad i Astar-plattformen

Produktblad behåller eget repo, Next-bygge, deployment, databastabeller, identitetskopplingar, skolroller och RLS. A4-mall och sparade bildreferenser ändras inte.

För en monterad app bygg med `NEXT_PUBLIC_APP_BASE_PATH=/produktblad` och `NEXT_PUBLIC_PORTAL_URL=https://portal.astar.se`. Servern behöver `APP_URL=https://portal.astar.se/produktblad` och `PORTAL_ISSUER=https://portal.astar.se`. Utan basePath behålls tidigare rootrouting. Next basePath är ett byggtidsval och kräver nytt barnbygge vid byte.

Next Link hanterar basvägen för interna länkar. Råa API-/media-/callback-/PDF-adresser använder `appPath`. Fontfiler bundlas med Next så även de får rätt prefix. Sparade medier omskrivs endast när de visas, aldrig i databasen. PDF-servern använder konfigurerad kanonisk origin i stället för inkommande Host.

SSO-callback är `${APP_URL}/api/portal/callback` och måste finnas i portalens explicita tillåtelselista. PKCE, engångstransaktioner, JWT-signatur, publik JWKS, live-introspektion och lokala permissions behålls. Normal sessionscookie får Path `/produktblad`; gammal iframe-cookie används inte i monterat läge. Origin på mutationer måste matcha `APP_URL`. En portaladmin blir fortfarande inte automatiskt Produktblad-admin.

Global navigation använder portalens `/platform/v1/navigation.js`, utan kopierad gemensam UI-implementation. Lokala menyer och befintligt skydd mot osparade ändringar bevaras. Navigationen är dold i utskrift och på `/render`.

Kopiera `.env.platform.example` till `.env.platform.local` och ange en **isolerad utvecklingsdatabas med begränsad approll**, migrerad enligt `docs/NEON.md`. Öppna `../Astarstudioportal/Astar.code-workspace` och starta alla tre tasks. Backend kör på 3002; besök `http://localhost:3000/produktblad`. Miljöfiler ska aldrig committas. Ändra inte befintlig `.env.local` eller produktionsdatabas för att köra tester.

Verifiera `npm run typecheck`, `npm run lint`, `npm run build` och `node node_modules/tsx/dist/cli.mjs scripts/test-platform.ts`. Portalens `tests/platform-e2e.mjs` kör de tre apparna med disponibla databaser och syntetiska identiteter. Det ersätter inte produktions-RLS eller stagingtest av externa rewrites och faktisk PDF-export. Routingens fullständiga migrationsplan finns i portalens `docs/MODULAR-PLATFORM.md`. Ingen driftsättning är godkänd genom dessa lokala ändringar.
