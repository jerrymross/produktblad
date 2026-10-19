# Borttagning och skräpkorg

Beställt 19 oktober 2026. Admin kan ta bort skolornas produktblad. Skolredaktörer kan ta bort blad som de själva har skapat via **Nytt produktblad** eller **Skapa kopia**, om skolåtkomsten finns kvar. Äldre katalogposter har ingen säker skaparmetadata och kan därför bara tas bort av admin. Mallens exempelblad tas inte bort.

## Användning

- Välj ett blad i biblioteket och klicka **Ta bort blad** i detaljpanelen, eller använd samma knapp i redigeraren. Spara eventuella osparade ändringar först i redigeraren.
- Bekräftelsen visar bladets namn och skola. **Avbryt** gör inga ändringar.
- Bladet försvinner från biblioteket. Ett originals kopior följer med. Innehåll, privata bilder, versionshistorik, skaparmetadata och låst/slutförd status bevaras.
- Admin öppnar **Administration → Skräpkorg**, söker på blad/skola/användare och väljer **Återställ**. Ett originals kopior kommer tillbaka, förutom kopior som tagits bort separat. Återställ originalet före en separat borttagen kopia.
- Inga blad raderas permanent och ingen automatisk tömning sker.

## Teknik och behörighet

Migration `008-sheet-trash.sql` inför en separat `sheet_trash` med borttagningstid, användare och ett nytt UUID för varje borttagning. Begränsade runtime-roller får endast läsa tabellen. De får inte hårdradera `sheets`. Funktionerna `trash_sheet` och `restore_sheet` kontrollerar den skyddade centralrollen, skolmedlemskap respektive oföränderlig skaparmetadata. Återställning och listning av skräpkorgen är endast för admin.

En restriktiv RLS-policy döljer borttagna blad och deras kopior, även för admin i ordinarie läsning. Historik och lås omfattas via sina befintliga RLS-policyer. Skyddande triggers stoppar även skrivning från SECURITY DEFINER-funktioner till borttagna blad. Originalets radlås och kopiornas radlås serialiserar borttagningen med sparning. Gamla redigeringslås tas bort och kan inte användas igen efter återställning.

POST `/api/sheets/[id]/trash` kräver samma origin, verifierad inloggning, `confirmed:true` och förväntad revision. GET/POST `/api/admin/trash` listar respektive återställer; återställning kräver den aktuella borttagningens UUID så att ett gammalt försök inte kan återställa en senare borttagning. Borttagna statiska katalog-id:n filtreras ur biblioteket och kan inte återskapas av vanlig öppning eller lokal import.

Om migrationen inte är installerad fungerar tidigare blad som förut, borttagningsknappar visas inte och skräpkorgen visar att aktivering saknas.

## Aktivering och verifiering

Migration 008 aktiverades den 19 oktober 2026 i `studio_dev` och `studio`. Båda liveproven passerade med rollback. Typkontroll, riktad ESLint, produktionsbygge och den isolerade API/RLS-/Chrome-kontrollen passerade. En inloggad produktionssession har inte automatiserats; verifieringen i faktisk databas är separat från det lokala webbläsarprovet.

```powershell
npx tsx scripts/migrate-sheet-trash.ts dev <ignorerad-ägar-env>
npx tsx scripts/verify-sheet-trash-live.ts dev <ignorerad-ägar-env>
npx tsx scripts/migrate-sheet-trash.ts prod <ignorerad-ägar-env>
npx tsx scripts/verify-sheet-trash-live.ts prod <ignorerad-ägar-env>
```

Kör aktivering endast med användarens driftinstruktion. Miljön måste anges uttryckligen. Migrationen förutsätter 007, låser migrationskörningen och ändrar inte befintligt bladinnehåll.

`node scripts/test-sheet-trash.mjs` kör verkliga API-handlers mot isolerad PostgreSQL/PGlite med begränsad runtime-roll: ägarskap, skolåtkomst, adminåterställning, bekräftelse, origin, inaktuella versioner, RLS, SQL-kringgående, kopior, lås och bevarad historik. Därefter körs Chrome med de verkliga komponenterna, portalens v3-stilar och samma API/databas: avbryt, bekräfta, återförsök efter fel och återställning. Skärmbilder finns under ignorerade `work/trash/`. Testet förutsätter samma lokala PGlite-installation som `test-added-sheets.mjs` samt portalrepot bredvid detta repo.

Liveprovet använder ägaranslutning och rollback för tillfälliga provblad. Det verifierar funktionerna och runtime-rollens katalogprivilegier/RLS-konfiguration, inte en verklig inloggad produktionssession. A4-renderare och PDF-layout ändras inte av denna uppdatering.
