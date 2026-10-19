import type { PoolClient } from "pg";
import { catalogEntry, type CatalogEntry } from "@/lib/catalog";
import { transaction } from "@/lib/db";
import { HttpError } from "@/lib/access";
import type { AddedSheet } from "@/lib/added-sheets";

export async function addedSheetsAvailable(client: PoolClient): Promise<boolean> {
  return (await client.query("SELECT to_regclass('added_sheets') IS NOT NULL AS available")).rows[0].available;
}
export async function resolveEntry(client: PoolClient, id: string): Promise<CatalogEntry | undefined> {
  const existing = catalogEntry(id);
  if (existing) return existing;
  const copy = /^copy:([12]):(new:[a-f0-9-]{36})$/.exec(id);
  const source = copy?.[2] ?? id;
  if (!/^new:[a-f0-9-]{36}$/.test(source) || !await addedSheetsAvailable(client)) return undefined;
  const result = await client.query('SELECT sheet_id AS id, school_id AS school, program, title FROM added_sheets WHERE sheet_id=$1', [source]);
  const entry = result.rows[0] as CatalogEntry | undefined;
  return entry && copy ? { ...entry, id, sourceId: source, copyNumber: Number(copy[1]) } : entry;
}
export const entryForUser = (user: string, id: string) => transaction(user, client => resolveEntry(client, id));

export async function listAddedSheets(client: PoolClient, adminOnly = false): Promise<AddedSheet[]> {
  if (adminOnly && !(await client.query('SELECT is_central() AS allowed')).rows[0].allowed)
    throw new HttpError(403, "Endast admin kan se alla tillagda produktblad.");
  if (!await addedSheetsAvailable(client)) return [];
  return (await client.query(`SELECT a.sheet_id AS id,a.school_id AS school,a.program,a.title,
    a.created_at AS "createdAt",a.created_by AS "createdBy",u.name AS "creatorName",s.revision
    FROM added_sheets a JOIN sheets s ON s.id=a.sheet_id LEFT JOIN "user" u ON u.id=a.created_by
    ORDER BY a.created_at DESC,a.sheet_id`)).rows;
}
