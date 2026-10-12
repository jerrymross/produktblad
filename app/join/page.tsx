import { pageIdentity } from "@/lib/access";
import { AcceptPortalInvitation } from "@/components/AcceptPortalInvitation";
export default async function Join({searchParams}:{searchParams:Promise<{invite?:string}>}) {
  const {invite}=await searchParams;
  const token=invite && /^[a-f0-9]{64}$/.test(invite)?invite:"";
  const user=await pageIdentity(`/join?invite=${token}`);
  return <AcceptPortalInvitation token={token} email={user.email}/>;
}
