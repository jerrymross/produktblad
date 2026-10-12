import { api } from "@/lib/access";
import { management } from "@/lib/portal-management";
export async function GET(request: Request) {return api(async()=>Response.json(await management(request,async db=>{
  const schools=(await db.query("SELECT id FROM schools WHERE id<>'__templates__' ORDER BY id")).rows.map(row=>row.id);
  const accounts=(await db.query(`SELECT u.id,u.name,u.email,EXISTS(SELECT 1 FROM central_roles c WHERE c.user_id=u.id) AS admin,
    ARRAY(SELECT school_id FROM school_memberships m WHERE m.user_id=u.id ORDER BY school_id) AS schools
    FROM "user" u WHERE NOT EXISTS(SELECT 1 FROM portal_identities i WHERE i.user_id=u.id) AND u.email NOT LIKE 'portal-%@identity.invalid' ORDER BY u.name,u.email`)).rows;
  return {schools,accounts};
}),{headers:{"Cache-Control":"no-store"}}));}
