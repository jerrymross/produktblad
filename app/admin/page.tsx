import Link from "next/link";
import { redirect } from "next/navigation";
import { pageIdentity, requireAdmin, HttpError } from "@/lib/access";
import { AppSidebar } from "@/components/AppSidebar";

export default async function AdminPage() {
  const user = await pageIdentity();
  try { await requireAdmin(user.id); }
  catch (error) {
    if (error instanceof HttpError && error.status === 403) redirect("/produktblad");
    throw error;
  }
  return <><AppSidebar /><main className="admin-page">
    <span className="eyebrow-ui">CENTRAL ADMINISTRATION</span>
    <h1>Adminläge</h1>
    <p>Inloggad som {user.name}. Här hanterar du alla skolors produktblad, gemensamma bilder och inbjudningar.</p>
    <div className="admin-actions">
      <Link href="/produktblad"><h2>Alla produktblad</h2><p>Öppna och redigera blad för alla skolor.</p></Link>
      <Link href="/accounts"><h2>Bjud in kollega</h2><p>Välj skolor eller ge central administratörsbehörighet.</p></Link>
      <Link href="/?exempel=1"><h2>Mallens exempelblad</h2><p>Granska den gemensamma A4-mallen.</p></Link>
    </div>
    <p>Öppna <strong>Inställningar</strong> i menyn för att hantera Bild 1 och Bild 2 i det gemensamma bildbiblioteket.</p>
  </main></>;
}
