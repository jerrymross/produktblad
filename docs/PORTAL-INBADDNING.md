# Appar inne i portalen och infällbar meny

Produktblad skickar även ett innehållslöst produktblad-frame-ready till den exakta portal-origin när klientkoden laddats, och svarar på produktblad-frame-check från sin verifierade parent. Portalen använder detta för att visa återhämtning vid blockerad appvy. Meddelandet ger ingen behörighet och innehåller inga användardata. Portalens HTML cachas inte och dess skript är versionsbundna; en redan öppen gammal portalversion behöver laddas om.

Verifierat efter blockeringsrapporten 12 oktober: Produktblad 07d7593 / dpl_BBxVhiw8DR8cuBMHNdzWDZdo1xj9 och portal ce0c247 / dpl_5Vbd23oCtqw1mR9tDDcsGdzVSqsv publicerade READY. Typecheck, riktad ESLint och build passerade. Portalens lokala browserprov blockerade avsiktligt iframe via frame-ancestors och verifierade synlig återhämtning; konfigurationsprovet kontrollerade no-store och referrer-policy. Ett nytt fullständigt Chrome-produktionsprov passerade: appens laddningsbekräftelse, korrekt skolåtkomst/partitionerad session, menyväxling, befintligt blad/PDF, förnyelse med osparad text, fel origin, återanvänd biljett och indragen behörighet. Skärmbilden work/embedded-collapsed.png granskades. Den tidigare rapporterade blockeringen kunde inte reproduceras i en ny portalsession; dess exakta orsak är inte bekräftad.

Beställt 12 oktober 2026. Portalens sidomeny kan fällas in/visas med en knapp i toppraden. Valet lagras som lokal gränssnittspreferens; växling ändrar bara layoutklassen och laddar inte om den öppna appen.

Appkort öppnar en sandboxad iframe i portalens arbetsyta, utan nytt fönster. Produktblad har en särskild autentiserad inbäddningsbrygga. Andra externa appar visas via sina konfigurerade HTTPS-adresser; deras egna frame-/inloggningsregler kan fortfarande neka inbäddning och kringgås inte.

Portalens server utfärdar ett normalt sessionsbundet Produktblad-token efter levande appåtkomstkontroll. Token skickas endast server-till-server till `/api/portal/embed-ticket`. Produktblad verifierar JWT och introspection och lagrar token server-side. Browsern får endast en slumpmässig engångsbiljett som överförs i ett POST-formulär till appens iframe, aldrig i URL. Biljetten gäller högst 60 sekunder, lagras hashad och förbrukas atomiskt. Ursprung måste vara exakt portalen och fetch-destination måste vara iframe. Portalåtkomst kontrolleras igen när biljetten förbrukas.

Migration 006 lägger till engångsbiljetter i studio_dev/studio, utan ändringar i blad, medlemskap eller roller. Normal direktinloggning behåller SameSite=Lax-cookie. Inbäddning använder separat `__Host-produktblad-embedded`: HttpOnly, Secure, SameSite=None, Partitioned, Path=/ och utan Domain. Cookie är partitionerad till portalens översta site. JWT förblir på servern och sessionen upphör vid JWT-exp. Produktblads frame-ancestors tillåter endast self och den exakta portalen. Portalens egen frame-ancestors förblir none.

API-, skol-/admin- och PDF-kontroller använder samma verifierade identitet, introspection och befintlig RLS. Produktblad-utloggning raderar båda lokala sessionsvarianterna. Portalutloggning/indragning nekar fortsatt appåtkomst. Förnyelse sker med en ny engångsbiljett i en dold hjälpram; redigeraren behöver inte laddas om och osparat innehåll bevaras. postMessage kontrollerar exakt origin och avsändande iframe; meddelanden innehåller inga token eller personuppgifter. Osparade ändringar meddelas till portalens navigationsskydd.

En aktuell webbläsare med CHIPS-stöd behövs; äldre webbläsare får en kontrollerad förnyelse-/cookievy, ingen osäker fallback. Se [MDN partitionerade cookies](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies/Partitioned_cookies) och [frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).

Statisk och faktisk browser-/produktionsverifiering redovisas separat efter proverna. Inga privata portalnycklar kopieras och inga nya miljövariabler krävs.

## Verifierat 12 oktober 2026

- Produktblad: commit 579f01f, deployment dpl_4z669cADoYedTLGkKpNY9v5ZKfuo, READY på produktblad.vercel.app.
- Portal: commit 34bf88d, deployment dpl_44Gaq43vT8h9GYyVUQgH8qYUB5zC, READY på astar-studio-portal.vercel.app.
- Migration 006 aktiverad. Befintliga blad/roller/medlemskap ändras inte av migrationen.
- Lokalt: lint utan fel (en äldre work-varning), typecheck och build passerade. Portalens syntax-/konfigurationsprov och isolerade SQLite-browser-/SSO-prov, nu även menyväxling, passerade.
- Produktion: scripts/test-portal-embed-production.mjs kördes med en separat syntetisk portalidentitet och skolkoppling. Chrome startades med test-third-party-cookie-phaseout. Appkort öppnade Produktblad i iframe, exakt en browserflik fanns, toppadressen låg kvar på portalen och /api/me gav rätt skola utan adminroll. Den faktiska sessionens cookie hade Secure/HttpOnly/SameSite=None och partitionKey.
- Menyn fälldes in och visades igen. Iframe blev bredare och dess session/frame bevarades. Den faktiska appvyn granskades visuellt.
- Befintligt blad öppnades från iframe och verklig Vercel-PDF-export gav HTTP 200 och PDF-signatur. Bladversionen skrevs inte om. PDF-layouten ändras inte av detta steg.
- En text ändrades faktiskt i redigeraren utan sparning. Testidentitetens lokala session sattes till utgången, API gav 401, och hjälpramen förnyade sessionen. Originalredigeraren, den osparade texten och en-fliksläget bevarades; API gav därefter 200.
- Fel parent-origin gav 403. Återanvänd engångsbiljett gav 401. Indragen portalappåtkomst gav 401 även i redan öppen iframe. Inga browser-JavaScriptfel noterades. Bara egna testkonton, deras sessioner och redigeringslås återställdes.

Vid det första browserprovet gjorde portalens no-referrer-policy Origin null vid formulär-POST och anropet nekades korrekt. Portalen använder nu strict-origin-when-cross-origin för att behålla verifierbart ursprung utan att skicka cross-origin URL-sökväg. Origin-kontrollen har inte tagits bort eller öppnats för andra sajter. Produktblads svar använder fortsatt no-referrer. Se [MDN Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin).

Aktuella Chrome-prov etablerar inte Safari-/Firefox-/äldre-browserverifiering. Lokala browserprov omfattar portalens UI/SSO; själva inbäddningskopplingen provades i produktion. Neon/Postgres används, inte Supabase. Inga e-postmeddelanden skickades.
