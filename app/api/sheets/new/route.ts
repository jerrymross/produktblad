import { api, identity, sameOrigin, HttpError } from "@/lib/access";
import { transaction } from "@/lib/db";
import { initialSheet } from "@/lib/catalog";
import { templateVersion } from "@/lib/sheet";
import { newSheetPrograms } from "@/lib/added-sheets";
import { addedSheetsAvailable } from "@/lib/added-sheets-server";

export async function GET(request: Request) { return api(async () => {
  const user = await identity(request);
  return transaction(user.id, async client => Response.json({
    available: await addedSheetsAvailable(client), programs: newSheetPrograms,
    schools: (await client.query("SELECT id FROM schools WHERE id NOT LIKE '\\_\\_%' AND can_access_school(id) ORDER BY id")).rows.map(row => row.id),
  }, { headers: { "Cache-Control": "no-store" } }));
}); }
export async function POST(request: Request) { return api(async () => {
  sameOrigin(request);
  const user = await identity(request);
  const raw = await request.text();
  if (raw.length > 2000) throw new HttpError(413, "Formuläret är för stort.");
  const body = JSON.parse(raw);
  if (!body || typeof body !== "object" || Array.isArray(body) ||
    Object.keys(body).some(key => !["requestId", "school", "program", "title"].includes(key)) ||
    typeof body.title !== "string" || typeof body.school !== "string" || body.school.length > 150 ||
    !newSheetPrograms.includes(body.program) || typeof body.requestId !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(body.requestId))
    throw new HttpError(400, "Kontrollera namn, utbildningsform och skola.");
  const title = body.title.trim().replace(/\s+/g, " ");
  if (!title || title.length > 150) throw new HttpError(400, "Namnet måste innehålla 1–150 tecken.");
  return transaction(user.id, async client => {
    if (!await addedSheetsAvailable(client)) throw new HttpError(503, "Nya produktblad har ännu inte aktiverats. Kontakta administratören.");
    const content = initialSheet({ id: "", school: body.school, program: body.program, title });
    const result = await client.query("SELECT create_added_sheet($1,$2,$3,$4,$5,$6) AS id",
      [body.requestId, body.school, body.program, title, content, templateVersion(content)]);
    return Response.json({ id: result.rows[0].id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  });
}); }
