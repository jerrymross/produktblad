import type { PoolClient } from "pg";
import { HttpError } from "@/lib/access";

export async function trashAvailable(client: PoolClient): Promise<boolean> {
  return (await client.query("SELECT to_regclass('sheet_trash') IS NOT NULL AS available")).rows[0].available;
}
export async function assertSheetActive(client: PoolClient, id: string) {
  if (await trashAvailable(client) && (await client.query("SELECT sheet_in_trash($1) AS deleted", [id])).rows[0].deleted)
    throw new HttpError(404, "Bladet ligger i skräpkorgen. Kontakta admin om det ska återställas.");
}
export async function trashPermissions(client: PoolClient, id: string) {
  if (!await trashAvailable(client)) return { canDelete: false };
  return { canDelete: (await client.query("SELECT can_trash_sheet($1) AS allowed", [id])).rows[0].allowed as boolean };
}
