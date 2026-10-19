import Link from "next/link";
import { redirect } from "next/navigation";
import { pageIdentity, requireAdmin, HttpError } from "@/lib/access";
import { AppSidebar } from "@/components/AppSidebar";
import { TrashSheets } from "@/components/TrashSheets";
export default async function TrashPage() {
  const user = await pageIdentity("/admin/trash");
  try { await requireAdmin(user.id); } catch (error) {
    if (error instanceof HttpError && error.status === 403) redirect("/produktblad");
    throw error;
  }
  return <><AppSidebar /><main className="admin-page"><span className="eyebrow-ui">CENTRAL ADMINISTRATION</span><h1>Skräpkorg</h1>
    <nav className="admin-section-links" aria-label="Adminflikar"><Link href="/admin">Översikt</Link><Link href="/admin/added">Tillagda produktblad</Link><Link href="/admin/trash" aria-current="page">Skräpkorg</Link></nav><TrashSheets /></main></>;
}
