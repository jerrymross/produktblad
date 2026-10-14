import Link from "next/link";
import {PortalAdministrationLink} from "@/components/PortalAdministrationLink";
import { redirect } from "next/navigation";
import { pageIdentity, requireAdmin, HttpError } from "@/lib/access";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminOverview } from "@/components/AdminOverview";

export default async function AdminPage() {
  const user = await pageIdentity("/admin");
  try { await requireAdmin(user.id); }
  catch (error) {
    if (error instanceof HttpError && error.status === 403) redirect("/produktblad");
    throw error;
  }
  return <><AppSidebar /><main className="admin-page">
    <span className="eyebrow-ui">CENTRAL ADMINISTRATION</span>
    <h1>Administration</h1>
    <p>Inloggad som {user.name}. Här hanterar du alla skolors produktblad, gemensamma bilder och inbjudningar.</p>
    <div className="admin-actions">
      <Link href="/produktblad"><h2>Alla produktblad</h2><p>Öppna och redigera blad för alla skolor.</p></Link>
      <PortalAdministrationLink><h2>Hantera användare i portalen</h2><p>Bjud in, välj Produktblad-roll, tilldela skolor och koppla befintliga konton.</p></PortalAdministrationLink>
      <Link href="/?exempel=1"><h2>Mallens exempelblad</h2><p>Granska den gemensamma A4-mallen.</p></Link>
    </div>
    <p>Öppna <Link href="/images">Bildbank</Link> för att hantera utbildningsbilderna.</p>
    <nav className="admin-section-links" aria-label="Adminöversikt"><a href="#activity">Ändringslogg</a><a href="#members">Medlemsregister</a><a href="#invitations">Inbjudningar</a></nav>
    <AdminOverview />
  </main></>;
}
