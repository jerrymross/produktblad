import { Login } from "@/components/Login";
export default async function LoginPage({searchParams}:{searchParams:Promise<{invite?:string}>}) {const {invite}=await searchParams;return <Login invite={invite}/>;}
