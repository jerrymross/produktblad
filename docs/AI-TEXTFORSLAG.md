# AI-textförslag i Produktblad

Alla inloggade användare med appåtkomst och behörighet till bladets skola kan skapa textförslag. Central administratörsroll krävs inte. Befintliga skolroller, redigeringslås och slutlåsning gäller fortfarande.

Välj **Skapa textförslag** under ett textfält i redigeraren. Ange bekräftade fakta om utbildningen och välj **Skapa förslag**. Granska och redigera svaret eller välj **Gör kortare**. **Använd text** lägger in förslaget i det valda fältet; befintlig text ersätts först efter bekräftelse. Spara därefter utkastet som vanligt. Inget sparas automatiskt och A4-mallens utformning ändras inte.

Funktionen finns för intro, varför utbildningen, lärandemål, upplägg, utbildningsform, målgrupp, ekonomi och start. Fältens gränser är 180–800 tecken. Kontrollera alltid förhandsvisningen: teckengränsen garanterar inte att texten ryms i varje mall. Saknade fakta visas som kompletteringsbehov. Ingen webbsökning sker.

## Serverkoppling

`POST /api/sheets/[id]/ai` kontrollerar ursprung, inloggning, skolåtkomst och slutlåsning. Servern hämtar användarens befintliga SSO-token och anropar portalens `POST /api/ai/apps/v1/product-sheet-text`. Token lämnas aldrig till webbläsaren. Endast utbildningsnamn, utbildningsform, valt fält, angivet faktaunderlag och aktuell fälttext skickas. Behörigheten kontrolleras igen efter generering.

Portalen använder sin befintliga AI-leverantör, modell, aktiveringsinställning och kvoter. Inga nya nycklar behövs i Produktblad. `PORTAL_ISSUER` och befintlig SSO-konfiguration måste vara rätt. AI Studio-menyn är fortsatt endast för administratörer. Central paus eller förbrukad kvot ger ett felmeddelande utan att bladets innehåll ändras.

## Verifiering

Portalens `tests/ai-core.test.mjs` testar API-kontrakt, vanlig användare, fel token, kvoter och återkallad åtkomst. `PRODUCT_AI_TEST=1 node tests/platform-e2e.mjs` i portalprojektet testar hela lokala SSO- och redigeringsflödet med isolerade databaser och simulerat leverantörssvar. Detta verifierar inte liveleverantörens tillgänglighet eller textkvalitet i produktion.
