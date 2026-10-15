# AI-textförslag i Produktblad

Alla inloggade användare med appåtkomst och behörighet till bladets skola kan skapa textförslag. Central administratörsroll krävs inte. Befintliga skolroller, redigeringslås och slutlåsning gäller fortfarande.

Välj **Skapa textförslag** under ett textfält i redigeraren. Klistra in utbildningssidans https-länk på astar.se och välj **Hämta från astar.se**, eller skriv bekräftade fakta manuellt. Hämtningen visar källans titel, länk och hämtningstid och fyller faktarutan med redigerbar text. Kontrollera utbildning, ort och utbildningsform, ta bort irrelevanta uppgifter och markera granskningsrutan. Välj sedan **Skapa förslag**. Granska och redigera svaret eller välj **Gör kortare**. **Använd text** lägger in förslaget i det valda fältet; befintlig text ersätts först efter bekräftelse. Spara därefter utkastet som vanligt. Inget sparas automatiskt och A4-mallens utformning ändras inte.

Funktionen finns för intro, varför utbildningen, lärandemål, upplägg, utbildningsform, målgrupp, ekonomi och start. Fältens gränser är 180–800 tecken. Kontrollera alltid förhandsvisningen: teckengränsen garanterar inte att texten ryms i varje mall. Saknade fakta visas som kompletteringsbehov. Den angivna sidan hämtas; automatisk webbsökning och automatisk matchning av utbildning/ort ingår inte. Källinformationen visas i dialogen men sparas inte med bladversionen.

## Serverkoppling

`POST /api/sheets/[id]/ai/source` kontrollerar ursprung, inloggning, skolåtkomst och slutlåsning före hämtning och kontrollerar åtkomsten igen efteråt. Bara HTTPS på exakt `astar.se` eller `www.astar.se` tillåts, utan egna portar eller inloggningsuppgifter. Varje omdirigering valideras separat (högst tre). Inga sessionscookies eller SSO-token skickas till webbplatsen. Hämtningen har 10 sekunders tidsgräns och högst 1 MB HTML. Cheerio 1.2.0 extraherar text; script, menyer, sidhuvud, sidfot och formulär tas bort. Högst 6 000 tecken visas, med varning om texten begränsats. Sidor som kräver JavaScript kan behöva manuellt underlag. Resultatet renderas som text, aldrig HTML. Granskningsrutan är användarstöd, inte en serverbehörighet eller faktaverifiering.

`POST /api/sheets/[id]/ai` kontrollerar ursprung, inloggning, skolåtkomst och slutlåsning. Servern hämtar användarens befintliga SSO-token och anropar portalens `POST /api/ai/apps/v1/product-sheet-text`. Token lämnas aldrig till webbläsaren. Endast utbildningsnamn, utbildningsform, valt fält, angivet faktaunderlag och aktuell fälttext skickas. Behörigheten kontrolleras igen efter generering.

Portalen använder sin befintliga AI-leverantör, modell, aktiveringsinställning och kvoter. Inga nya nycklar behövs i Produktblad. `PORTAL_ISSUER` och befintlig SSO-konfiguration måste vara rätt. AI Studio-menyn är fortsatt endast för administratörer. Central paus eller förbrukad kvot ger ett felmeddelande utan att bladets innehåll ändras.

## Verifiering

15 oktober 2026: `npx tsx scripts/test-astar-source.ts --live` passerade URL-regler, blockerad extern omdirigering, HTML-extraktion, storleksgräns och felaktig innehållstyp. Verklig hämtning av `https://astar.se/utbildningar/kock-norrkoping-2` gav 3 679 tecken utan kapning. Lokal isolerad Chrome-kontroll av dialogen på desktop/mobil passerade hämtning, granskningskrav, textförslag och bekräftad ersättning med simulerade API-svar. Ingen horisontell overflow eller JavaScript-fel. Skärmbilder finns lokalt i `work/ai-source/`. Detta är inte ett end-to-end-prov med riktig inloggning eller AI-leverantör. Ingen ny PDF-export, databas/RLS-körning eller Vercel-verifiering har gjorts för ändringen; bladrenderaren är oförändrad.

HTML-extraktionen följer [Cheerios dokumentation](https://cheerio.js.org/docs/basics/manipulation/). Kontrollera alltid den hämtade sidans underlag, särskilt relaterade utbildningar och ortsspecifika uppgifter.

Statiska kontroller: `npm run typecheck`, `npm run lint` och `npm run build` passerade. Lint rapporterade en befintlig varning i den lokala filen `work/verify-neon-copies.mjs`. `npm audit` rapporterade fem höga fynd i befintliga ESLint/fast-glob-kedjan, inga i Cheerio-kedjan; ingen bred beroendeuppgradering ingår i denna ändring.

Portalens `tests/ai-core.test.mjs` testar API-kontrakt, vanlig användare, fel token, kvoter och återkallad åtkomst. `PRODUCT_AI_TEST=1 node tests/platform-e2e.mjs` i portalprojektet testar hela lokala SSO- och redigeringsflödet med isolerade databaser och simulerat leverantörssvar. Detta verifierar inte liveleverantörens tillgänglighet eller textkvalitet i produktion.
