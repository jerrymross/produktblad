import { Accounts } from "@/components/Accounts";
import { pageIdentity,requireAdmin } from "@/lib/access";
import { redirect } from "next/navigation";
import {AppSidebar} from '@/components/AppSidebar';
export default async function AccountsPage(){const user=await pageIdentity("/accounts");try{await requireAdmin(user.id);}catch{redirect("/produktblad");}return <><AppSidebar/><Accounts/></>;}
