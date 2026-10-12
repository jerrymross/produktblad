import type {PoolClient} from "pg";
import {unavailableCopies,type CopyStatus} from "@/lib/copies";

export async function copiesAvailable(client:PoolClient){
  return (await client.query("SELECT to_regclass('sheet_copies') IS NOT NULL AS available")).rows[0].available as boolean;
}
export async function readCopies(client:PoolClient,id:string):Promise<CopyStatus>{
  if(!await copiesAvailable(client))return unavailableCopies;
  const result=await client.query('SELECT copy_id AS id,source_id AS "sourceId",copy_number AS "copyNumber",source_revision AS "sourceRevision" FROM sheet_copies WHERE source_id=$1 ORDER BY copy_number',[id]);
  return {available:true,copies:result.rows};
}
