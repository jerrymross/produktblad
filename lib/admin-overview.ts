import type { PoolClient } from "pg";
import { HttpError } from "@/lib/access";
import type { AdminOverviewData } from "@/lib/admin-types";

export async function queryAdminOverview(client: Pick<PoolClient, "query">): Promise<AdminOverviewData> {
  // The protected role is checked in the same transaction as the register reads.
  const permission = await client.query("SELECT is_central() AS allowed");
  if (permission.rows[0]?.allowed !== true) throw new HttpError(403, "Endast admin kan se medlemsregistret och ändringsloggen.");
  const members = await client.query(`SELECT u.id, u.name, u.email,
    CASE WHEN EXISTS(SELECT 1 FROM central_roles r WHERE r.user_id=u.id) THEN 'admin' ELSE 'user' END AS role,
    ARRAY(SELECT m.school_id FROM school_memberships m WHERE m.user_id=u.id ORDER BY m.school_id) AS schools,
    u."createdAt" AS "createdAt" FROM "user" u ORDER BY lower(u.name), lower(u.email), u.id`);
  const invitations = await client.query(`SELECT id, email, CASE WHEN central THEN 'admin' ELSE 'user' END AS role,
    school_ids AS schools, expires_at AS "expiresAt", used_at AS "usedAt",
    CASE WHEN used_at IS NOT NULL THEN 'accepted' WHEN expires_at <= now() THEN 'expired' ELSE 'pending' END AS status
    FROM invitations ORDER BY expires_at DESC, id DESC`);
  const activity = await client.query(`SELECT v.sheet_id AS "sheetId", s.title, s.school_id AS school,
    v.revision, v.created_at AS "changedAt", v.changed_by AS "changedBy", u.name, u.email
    FROM sheet_versions v JOIN sheets s ON s.id=v.sheet_id LEFT JOIN "user" u ON u.id=v.changed_by
    ORDER BY v.created_at DESC, v.sheet_id, v.revision DESC LIMIT 100`);
  return JSON.parse(JSON.stringify({ members: members.rows, invitations: invitations.rows, activity: activity.rows, loadedAt: new Date().toISOString() })) as AdminOverviewData;
}
