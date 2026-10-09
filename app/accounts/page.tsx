import { Accounts } from "@/components/Accounts";
import { pageIdentity,requireAdmin } from "@/lib/access";
import { redirect } from "next/navigation";
export default async function AccountsPage(){const user=await pageIdentity();try{await requireAdmin(user.id);}catch{redirect("/produktblad");}return <Accounts/>;}
