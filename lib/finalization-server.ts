import type { PoolClient } from "pg";
import { HttpError } from "@/lib/access";
import { unavailableFinalization, type Finalization } from "@/lib/finalization";

// Allow the app to be deployed before the explicitly authorized database migration.
export async function finalizationAvailable(client: PoolClient) {
  const result = await client.query("SELECT to_regclass('sheet_finalizations') IS NOT NULL AS available");
  return result.rows[0].available as boolean;
}

export async function readFinalization(client: PoolClient, id: string): Promise<Finalization> {
  if (!await finalizationAvailable(client)) return unavailableFinalization;
  const result = await client.query(`SELECT f.finalized,f.state_version AS "stateVersion",
    f.changed_at AS "changedAt",COALESCE(u.name,'Tidigare användare') AS "changedBy"
    FROM sheet_finalizations f LEFT JOIN "user" u ON u.id=f.changed_by WHERE f.sheet_id=$1`, [id]);
  return { available: true, finalized: false, stateVersion: 0, ...result.rows[0] };
}

// Call after locking the sheet row, in the same transaction as a save/lock.
export async function assertNotFinalized(client: PoolClient, id: string) {
  if ((await readFinalization(client, id)).finalized) {
    throw new HttpError(423, "Bladet är låst av admin. Dina osparade ändringar finns kvar här.");
  }
}
