import { portalUrl } from "@/lib/app-path";
import { Catalog } from "@/components/catalog/Catalog";
import { pageIdentity,accessProfile } from "@/lib/access";

export default async function ProductSheets() {
  const user=await pageIdentity();const profile=await accessProfile(user.id);
  if (!profile.admin && profile.schools.length === 0) return <main className="login-page"><section className="login-card"><h1>Du är inloggad</h1><p>En Produktblad-administratör behöver tilldela dig en skola innan du kan öppna biblioteket.</p><a href={portalUrl}>Till Astar Studio</a></section></main>;
  return <Catalog allowedSchools={profile.admin ? null : profile.schools} />;
}
