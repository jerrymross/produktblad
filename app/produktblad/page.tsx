import { Catalog } from "@/components/catalog/Catalog";
import { pageIdentity,accessProfile } from "@/lib/access";

export default async function ProductSheets() {
  const user=await pageIdentity();const profile=await accessProfile(user.id);
  return <Catalog allowedSchools={profile.admin ? null : profile.schools} />;
}
