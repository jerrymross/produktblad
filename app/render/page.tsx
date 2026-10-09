import { pageIdentity } from "@/lib/access";
import { readSheet } from "@/lib/sheets-server";
import { Sheet } from "@/components/sheet/Sheet";
export default async function RenderPage({searchParams}:{searchParams:Promise<{id?:string;revision?:string}>}) {const user=await pageIdentity();const {id,revision}=await searchParams;if(!id||!revision||!/^\d+$/.test(revision))throw new Error("Bladversion saknas.");const sheet=await readSheet(user.id,id,Number(revision));return <Sheet data={sheet.content}/>;}
