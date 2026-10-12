# Appar inne i portalen och infällbar meny

Beställt 12 oktober 2026. Portalens sidomeny kan fällas in/visas med en knapp i toppraden. Valet lagras som lokal gränssnittspreferens; växling ändrar bara layoutklassen och laddar inte om den öppna appen.

Appkort öppnar en sandboxad iframe i portalens arbetsyta, utan nytt fönster. Produktblad har en särskild autentiserad inbäddningsbrygga. Andra externa appar visas via sina konfigurerade HTTPS-adresser; deras egna frame-/inloggningsregler kan fortfarande neka inbäddning och kringgås inte.

Portalens server utfärdar ett normalt sessionsbundet Produktblad-token efter levande appåtkomstkontroll. Token skickas endast server-till-server till `/api/portal/embed-ticket`. Produktblad verifierar JWT och introspection och lagrar token server-side. Browsern får endast en slumpmässig engångsbiljett som överförs i ett POST-formulär till appens iframe, aldrig i URL. Biljetten gäller högst 60 sekunder, lagras hashad och förbrukas atomiskt. Ursprung måste vara exakt portalen och fetch-destination måste vara iframe. Portalåtkomst kontrolleras igen när biljetten förbrukas.

Migration 006 lägger till engångsbiljetter i studio_dev/studio, utan ändringar i blad, medlemskap eller roller. Normal direktinloggning behåller SameSite=Lax-cookie. Inbäddning använder separat `__Host-produktblad-embedded`: HttpOnly, Secure, SameSite=None, Partitioned, Path=/ och utan Domain. Cookie är partitionerad till portalens översta site. JWT förblir på servern och sessionen upphör vid JWT-exp. Produktblads frame-ancestors tillåter endast self och den exakta portalen. Portalens egen frame-ancestors förblir none.

API-, skol-/admin- och PDF-kontroller använder samma verifierade identitet, introspection och befintlig RLS. Produktblad-utloggning raderar båda lokala sessionsvarianterna. Portalutloggning/indragning nekar fortsatt appåtkomst. Förnyelse sker med en ny engångsbiljett i en dold hjälpram; redigeraren behöver inte laddas om och osparat innehåll bevaras. postMessage kontrollerar exakt origin och avsändande iframe; meddelanden innehåller inga token eller personuppgifter. Osparade ändringar meddelas till portalens navigationsskydd.

En aktuell webbläsare med CHIPS-stöd behövs; äldre webbläsare får en kontrollerad förnyelse-/cookievy, ingen osäker fallback. Se [MDN partitionerade cookies](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies/Partitioned_cookies) och [frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).

Statisk och faktisk browser-/produktionsverifiering redovisas separat efter proverna. Inga privata portalnycklar kopieras och inga nya miljövariabler krävs.
