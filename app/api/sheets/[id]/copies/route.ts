import {api,identity,sameOrigin,HttpError} from "@/lib/access";
import {transaction} from "@/lib/db";
import {decodeSheetId} from "@/lib/sheet-id";
import {resolveEntry} from "@/lib/added-sheets-server";
import {copiesAvailable} from "@/lib/copies-server";

export async function POST(request:Request,context:{params:Promise<{id:string}>}){
  return api(async()=>{
    sameOrigin(request);const user=await identity(request);const id=decodeSheetId((await context.params).id);
    const body=await request.json();if(!Number.isInteger(body?.revision)||body.revision<1)throw new HttpError(400,"Ogiltig originalversion.");
    return transaction(user.id,async client=>{
      const entry=await resolveEntry(client,id);if(!entry||entry.sourceId)throw new HttpError(400,"Välj ett låst originalblad.");
      if(!await copiesAvailable(client))throw new HttpError(503,"Kopior har ännu inte aktiverats i databasen.");
      try{
        const result=await client.query("SELECT create_sheet_copy($1,$2) AS id",[id,body.revision]);
        return Response.json({id:result.rows[0].id},{status:201,headers:{"Cache-Control":"no-store"}});
      }catch(error){
        const code=(error as {code?:string}).code;
        const status=code==="42501"?403:code==="22023"?400:code==="40001"||code==="54000"?409:null;
        if(status)throw new HttpError(status,(error as Error).message);throw error;
      }
    });
  });
}
